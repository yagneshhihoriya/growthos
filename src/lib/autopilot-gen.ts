import { GoogleGenAI } from "@google/genai";
import type { Festival } from "@/lib/indian-festivals";

const CAPTION_MODEL =
  process.env.GEMINI_AUTOPILOT_MODEL?.trim() ||
  process.env.GEMINI_CAPTION_MODEL?.trim() ||
  "gemini-2.5-flash";
const CAPTION_FALLBACK_MODEL =
  process.env.GEMINI_CAPTION_FALLBACK_MODEL?.trim() || "gemini-2.0-flash";

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

export type AutopilotProductRef = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  colors: string[];
  fabric: string | null;
};

export type AutopilotDayPlan = {
  /** 1-indexed day of month */
  day: number;
  /** ISO YYYY-MM-DD for the IST calendar day */
  date: string;
  /** picked product id (from the seller's pool) */
  productId: string;
  /** festival name if the day matches one, else null */
  festival: string | null;
  /** caption body (no hashtags) */
  caption: string;
  /** 15–20 hashtags */
  hashtags: string[];
};

/** Rotate through the product pool deterministically — sellers expect a
 *  predictable mix, not a randomly-biased calendar. */
function pickProductForDay(pool: AutopilotProductRef[], dayIndex: number): AutopilotProductRef {
  if (pool.length === 0) throw new Error("Product pool is empty");
  return pool[dayIndex % pool.length];
}

/** Generate YYYY-MM-DD strings for every day in the (year, month). */
function daysOfMonth(year: number, month: number): string[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  return out;
}

function buildSystem(language: "hinglish" | "hindi" | "english"): string {
  return `You are an expert social media copywriter for Indian clothing sellers on Meesho, Flipkart, and Instagram.
You write captions that feel natural, conversational, and authentic — never corporate or translated.
Language: ${language}. Hinglish means mixing Hindi and English naturally as Indian sellers actually speak.
Each caption must be unique; never reuse the same opening line across days. Factor in festival context and
Indian buying behaviour: COD, limited stock urgency, size inclusivity, and family/gifting occasions.`;
}

function buildUser(
  year: number,
  month: number,
  plan: Array<{
    day: number;
    date: string;
    product: AutopilotProductRef;
    festival: Festival | null;
  }>
): string {
  const rows = plan.map(({ day, date, product, festival }) => {
    const festivalLine = festival ? `festival: ${festival.name}${festival.hook ? ` — ${festival.hook}` : ""}` : "festival: none";
    const priceLine = product.price ? `₹${product.price}` : "price TBD";
    return `Day ${day} (${date}) — product: "${product.name}", ${priceLine}, colors: ${product.colors.join(", ") || "n/a"}, fabric: ${product.fabric ?? "n/a"} | ${festivalLine}`;
  });

  return `Generate a 30-day Instagram + Facebook content calendar for ${month}/${year}.
For every day below produce ONE caption + 15–20 hashtags (mix broad, category, niche, location, trending).

Rules per caption:
- Under 220 characters
- 1–2 relevant emojis max, never forced
- Always mention COD availability naturally
- Always end with a soft CTA (DM, link in bio, WhatsApp)
- Vary hooks across days (question, offer, story, urgency, gifting)
- When a festival is listed, reference it explicitly and tie it to the product

Planning rows:
${rows.join("\n")}

Return ONLY valid JSON, no prose:
{
  "days": [
    { "day": 1, "date": "YYYY-MM-DD", "productId": "<id>", "festival": null, "caption": "…", "hashtags": ["tag1","tag2"] }
  ]
}`;
}

function isTransient(err: unknown): boolean {
  const e = err as { status?: number; code?: number; message?: string } | null;
  if (!e) return false;
  const code = e.status ?? e.code;
  if (code === 429 || code === 500 || code === 502 || code === 503 || code === 504) return true;
  const msg = String(e.message ?? "");
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL|high demand|overloaded/i.test(msg);
}

async function callGemini(
  system: string,
  user: string,
  model: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  const text = typeof res.text === "string" ? res.text : "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

/**
 * Deterministically assemble the product/festival skeleton, then ask Gemini
 * to fill in captions for all 30 days in a single call (cheaper + more
 * coherent than 30 separate calls). Falls back to a secondary model on 5xx.
 */
export async function generateAutopilotCalendar(params: {
  year: number;
  month: number;
  products: AutopilotProductRef[];
  language: "hinglish" | "hindi" | "english";
  festivalsByDate: Record<string, Festival>;
}): Promise<AutopilotDayPlan[]> {
  const { year, month, products, language, festivalsByDate } = params;
  if (products.length === 0) throw new Error("Select at least one product");

  const dates = daysOfMonth(year, month);
  const skeleton = dates.map((date, i) => ({
    day: i + 1,
    date,
    product: pickProductForDay(products, i),
    festival: festivalsByDate[date] ?? null,
  }));

  const system = buildSystem(language);
  const user = buildUser(year, month, skeleton);

  let raw: string | null = null;
  let lastErr: unknown = null;
  for (const model of [CAPTION_MODEL, CAPTION_FALLBACK_MODEL]) {
    try {
      raw = await callGemini(system, user, model);
      break;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[autopilot-gen] transient error on ${model}`, err);
    }
  }
  if (!raw) throw lastErr ?? new Error("Autopilot generation failed");

  let parsed: { days?: Array<Partial<AutopilotDayPlan>> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // strip fences / prose and try once more
    const stripped = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("Gemini returned unparseable JSON");
    }
    parsed = JSON.parse(stripped.slice(start, end + 1));
  }

  const byDate = new Map<string, Partial<AutopilotDayPlan>>();
  for (const d of parsed.days ?? []) {
    if (typeof d.date === "string") byDate.set(d.date, d);
  }

  return skeleton.map(({ day, date, product, festival }) => {
    const g = byDate.get(date) ?? {};
    return {
      day,
      date,
      productId: product.id,
      festival: festival?.name ?? null,
      caption: typeof g.caption === "string" && g.caption.trim()
        ? g.caption.trim()
        : `${product.name} · ₹${product.price ?? ""} · COD available. DM to order.`.trim(),
      hashtags: Array.isArray(g.hashtags)
        ? g.hashtags.filter((h): h is string => typeof h === "string").slice(0, 20)
        : [],
    };
  });
}
