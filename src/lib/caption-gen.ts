import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

const CAPTION_MODEL = process.env.GEMINI_CAPTION_MODEL?.trim() || "gemini-2.5-flash";
/** If the primary model 503's, try this one next (can be overridden via env). */
const CAPTION_FALLBACK_MODEL =
  process.env.GEMINI_CAPTION_FALLBACK_MODEL?.trim() || "gemini-2.0-flash";

function isTransient(err: unknown): boolean {
  const e = err as { status?: number; code?: number; message?: string } | null;
  if (!e) return false;
  const code = e.status ?? e.code;
  if (code === 429 || code === 500 || code === 502 || code === 503 || code === 504) return true;
  const msg = String(e.message ?? "");
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|high demand|overloaded/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type CaptionGenInput = {
  productName: string;
  category: string;
  /** Optional canonical super-category for category-aware prompting. */
  superCategory?: string;
  price: number;
  /** Clothing / footwear / bags / etc. */
  colors?: string[];
  sizes?: string[];
  fabric?: string;
  occasion?: string[];
  /** Electronics / home / bags / pets. */
  specs?: Record<string, string>;
  dimensions?: string;
  /** Electronics + beauty/food/health + home. */
  weight?: string;
  /** Beauty / food / health. */
  ingredients?: string;
  /** Marketing angle (works for any category). */
  highlight?: string;
  audience?: string[];
  offer?: string;
  cta?: string;
  platformTarget?: "instagram" | "facebook" | "both";
  language: "hindi" | "hinglish" | "english";
  tone: "casual" | "urgent" | "festive" | "premium";
  includeHashtags: boolean;
  sellerCity: string;
};

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

const CATEGORY_HOOK_GUIDE: Record<string, string> = {
  clothing: "fit, fabric, drape, occasion styling, size inclusivity",
  electronics: "standout spec (battery/camera/storage), performance, warranty, value-for-price",
  beauty: "visible benefits, key ingredients, skin/hair concern it solves, texture/feel",
  footwear: "comfort, grip, style occasion, everyday wearability",
  bags: "capacity, material feel, style versatility, organiser pockets",
  jewellery: "craftsmanship, metal/stone, occasion, gifting appeal",
  home: "material quality, size fit for rooms, aesthetic vibe, durability",
  food: "flavour, freshness, region/authenticity, weight/serving",
  health: "benefit, clinical/ayurvedic angle, dosage, certification",
  kids: "safety, age range, learning/fun value, durability",
  stationery: "build quality, use case, aesthetic, value pack",
  pets: "pet size suitability, safety, freshness/durability",
  general: "one concrete benefit, price fairness, trust + COD",
};

function buildDetailsBlock(input: CaptionGenInput): string {
  const lines: string[] = [];
  lines.push(`Product: ${input.productName}`);
  lines.push(
    `Category: ${input.category}${input.superCategory ? ` (super-category: ${input.superCategory})` : ""}`
  );
  lines.push(`Price: ₹${input.price}`);
  if (input.colors?.length) lines.push(`Colors: ${input.colors.join(", ")}`);
  if (input.sizes?.length) lines.push(`Sizes: ${input.sizes.join(", ")}`);
  if (input.fabric) lines.push(`Fabric: ${input.fabric}`);
  if (input.occasion?.length) lines.push(`Occasion: ${input.occasion.join(", ")}`);
  if (input.specs && Object.keys(input.specs).length) {
    lines.push("Key specs:");
    for (const [k, v] of Object.entries(input.specs)) lines.push(`- ${k}: ${v}`);
  }
  if (input.weight) lines.push(`Weight/volume: ${input.weight}`);
  if (input.dimensions) lines.push(`Dimensions: ${input.dimensions}`);
  if (input.ingredients) lines.push(`Ingredients / benefits: ${input.ingredients}`);
  return lines.join("\n");
}

function buildMarketingBlock(input: CaptionGenInput): string {
  const lines: string[] = [];
  if (input.highlight) lines.push(`- Highlight / USP to emphasize: ${input.highlight}`);
  if (input.audience?.length) lines.push(`- Target audience: ${input.audience.join(", ")}`);
  if (input.offer) lines.push(`- Offer / discount: ${input.offer}`);
  if (input.cta) lines.push(`- Primary call-to-action: ${input.cta}`);
  if (input.platformTarget) lines.push(`- Primary platform: ${input.platformTarget}`);
  return lines.length ? `Marketing angle:\n${lines.join("\n")}` : "";
}

function buildPrompts(input: CaptionGenInput): { system: string; user: string } {
  const hookGuide = CATEGORY_HOOK_GUIDE[input.superCategory ?? "general"] ?? CATEGORY_HOOK_GUIDE.general;
  const platformNote =
    input.platformTarget === "facebook"
      ? "Facebook-friendly copy (slightly longer, fewer hashtags — max 8)."
      : input.platformTarget === "both"
        ? "Usable on both Instagram and Facebook — keep length ≤ 220 chars."
        : "Instagram-first: short, punchy, emoji-light.";

  const system = `You are an expert social media copywriter for Indian D2C and marketplace sellers on Instagram, Facebook, Meesho, and Flipkart.
You write captions that feel natural, conversational, and authentic — never corporate or translated.
You understand Indian shopping culture, COD buying behaviour, and WhatsApp-first commerce.
You tailor the hook to the product category — for this product, emphasize: ${hookGuide}.
You always write in ${input.language} — Hinglish means mixing Hindi and English naturally as Indian sellers actually speak.
Indian buyers respond to: urgency, limited stock, COD availability, festival context, and a clear concrete benefit over vague praise.`;

  const hashtagRule = input.includeHashtags
    ? `- After each caption, add 15-20 hashtags in the \`hashtags\` array: mix broad (4), category (5), niche (4), location (3), trending (2)`
    : `- Do not include hashtags in the JSON (use empty arrays)`;

  const marketingBlock = buildMarketingBlock(input);

  const user = `Generate exactly 3 caption variants for this product. Each must be different in tone and hook.

${buildDetailsBlock(input)}
Seller city: ${input.sellerCity}
Tone: ${input.tone}
Language: ${input.language}
${marketingBlock ? `\n${marketingBlock}\n` : ""}
Rules:
- ${platformNote}
- Each caption under 220 characters.
- Include 1-2 relevant emojis naturally — not forced.
- Always mention COD availability naturally.
- End with the primary call-to-action above (fallback: DM / link in bio / WhatsApp).
- If an offer is given, make ONE of the three variants lead with it.
- Never use generic filler like "premium quality" or "best product".
${hashtagRule}

Return ONLY valid JSON in this exact format, nothing else:
{
  "captions": [
    { "id": 1, "tone": "casual", "caption": "...", "hashtags": ["tag1", "tag2"] },
    { "id": 2, "tone": "urgent", "caption": "...", "hashtags": [] },
    { "id": 3, "tone": "emotional", "caption": "...", "hashtags": [] }
  ]
}`;

  return { system, user };
}

function textFromStreamChunk(chunk: unknown): string {
  const c = chunk as GenerateContentResponse;
  const t = typeof c.text === "string" ? c.text : "";
  if (t) return t;
  return "";
}

async function openStream(
  ai: GoogleGenAI,
  model: string,
  system: string,
  user: string
): Promise<AsyncIterable<GenerateContentResponse>> {
  return ai.models.generateContentStream({
    model,
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      maxOutputTokens: 2048,
      // Force valid JSON output — avoids markdown fences / prose wrapping
      // that previously broke the client parser.
      responseMimeType: "application/json",
    },
  });
}

/** Async iterator of UTF-8 text deltas for streaming HTTP responses.
 *  Retries transient 429/5xx errors with exponential backoff, then falls back
 *  to a secondary model (e.g. 2.0-flash) if the primary stays overloaded. */
export async function* streamCaptionJson(input: CaptionGenInput): AsyncGenerator<string> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey });
  const { system, user } = buildPrompts(input);

  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: CAPTION_MODEL, delayMs: 0 },
    { model: CAPTION_MODEL, delayMs: 800 },
    { model: CAPTION_MODEL, delayMs: 2000 },
    { model: CAPTION_FALLBACK_MODEL, delayMs: 500 },
  ];

  let lastErr: unknown = null;
  for (const { model, delayMs } of attempts) {
    if (delayMs) await sleep(delayMs);
    try {
      const stream = await openStream(ai, model, system, user);
      for await (const chunk of stream) {
        const delta = textFromStreamChunk(chunk);
        if (delta) yield delta;
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[caption-gen] transient error on ${model}, retrying`, err);
    }
  }
  throw lastErr ?? new Error("Caption generation failed after retries");
}

/** Stream JSON text deltas using fully custom system + user prompts (e.g. redesigned caption form). */
export async function* streamCaptionJsonCustom(system: string, user: string): AsyncGenerator<string> {
  const apiKey = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey });

  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: CAPTION_MODEL, delayMs: 0 },
    { model: CAPTION_MODEL, delayMs: 800 },
    { model: CAPTION_MODEL, delayMs: 2000 },
    { model: CAPTION_FALLBACK_MODEL, delayMs: 500 },
  ];

  let lastErr: unknown = null;
  for (const { model, delayMs } of attempts) {
    if (delayMs) await sleep(delayMs);
    try {
      const stream = await openStream(ai, model, system, user);
      for await (const chunk of stream) {
        const delta = textFromStreamChunk(chunk);
        if (delta) yield delta;
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[caption-gen] transient error on ${model} (custom prompt), retrying`, err);
    }
  }
  throw lastErr ?? new Error("Caption generation failed after retries");
}
