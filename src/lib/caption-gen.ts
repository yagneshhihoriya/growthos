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
  price: number;
  colors: string[];
  sizes: string[];
  fabric?: string;
  occasion?: string[];
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

function buildPrompts(input: CaptionGenInput): { system: string; user: string } {
  const system = `You are an expert social media copywriter for Indian clothing sellers on Meesho, Flipkart, and Instagram.
You write captions that feel natural, conversational, and authentic — never corporate or translated.
You understand Indian fashion culture, COD buying behaviour, and WhatsApp-first commerce.
You always write in ${input.language} — Hinglish means mixing Hindi and English naturally as Indian sellers actually speak.
You know that Indian clothing buyers respond to: urgency, limited stock, COD availability, festival context, and size inclusivity.`;

  const hashtagRule = input.includeHashtags
    ? `- After each caption, add 20 hashtags on a new line: mix broad (5), category (5), niche (5), location (3), trending (2)`
    : `- Do not include hashtags in the JSON (use empty arrays)`;

  const user = `Generate exactly 3 Instagram/Facebook caption variants for this product. Each must be different in tone and hook.

Product: ${input.productName}
Category: ${input.category}
Price: ₹${input.price}
Colors: ${input.colors.join(", ")}
Sizes: ${input.sizes.join(", ")}
${input.fabric ? `Fabric: ${input.fabric}` : ""}
${input.occasion?.length ? `Occasion: ${input.occasion.join(", ")}` : ""}
Seller city: ${input.sellerCity}
Tone: ${input.tone}
Language: ${input.language}

Rules:
- Each caption under 220 characters (Instagram limit is 2200 but shorter converts better)
- Include 1-2 relevant emojis naturally — not forced
- Always mention COD availability naturally
- Always end with a soft CTA (DM, link in bio, WhatsApp)
- Never use "premium quality" or "best product" — too generic
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
