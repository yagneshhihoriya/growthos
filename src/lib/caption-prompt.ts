import type { CaptionFormInput } from "@/lib/schemas/caption";
import { CATEGORY_FIELD_LABELS } from "@/lib/caption-categories";

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  hinglish:
    "Write in Hinglish (mix of Hindi and English). Use Roman script for Hindi words. Natural, conversational tone like how Indian sellers speak on Instagram.",
  hindi: "Write entirely in Hindi using Devanagari script. Natural and warm tone.",
  english: "Write in Indian English. Warm, relatable, not corporate.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  casual: "Friendly and conversational. Feel like a message from a friend.",
  urgent: "Create FOMO. Limited time / limited stock angle. Urgency without being pushy.",
  festive: "Celebratory and warm. Connect the product to the festive occasion or gifting.",
  premium: "Aspirational and refined. Quality over price. Subtle flex.",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short: "1-3 lines maximum. Punchy. Hook + CTA only.",
  medium: "4-6 lines. Hook + product highlight + offer + CTA.",
  long: "8-12 lines. Story format. Start with a relatable situation, introduce product naturally, build desire, close with offer and CTA.",
};

const HASHTAG_INSTRUCTIONS: Record<string, string> = {
  full: "Use 15-20 relevant hashtags in the hashtags array per caption. Mix broad (#IndianFashion) and niche (#KurtiLovers). Include 2-3 location tags if relevant.",
  minimal: "Use exactly 5 highly targeted hashtags in the hashtags array per caption.",
  none: "Use empty hashtags arrays [].",
};

const CTA_TEXT: Record<string, string> = {
  dm: "DM us to order",
  whatsapp: "WhatsApp us to order",
  link_in_bio: "Link in bio to shop",
  shop_now: "Shop now",
};

const AUDIENCE_LABELS: Record<string, string> = {
  women_18_24: "young women aged 18-24",
  women_25_35: "women aged 25-35",
  women_35_plus: "women aged 35+",
  men: "men",
  mothers: "mothers",
  budget_buyers: "budget-conscious buyers",
  gifting: "people looking for gifts",
};

/** System instruction: JSON-only response for Gemini structured output. */
export function captionJsonSystemInstruction(): string {
  return `You are an expert social media copywriter for Indian sellers.
Return ONLY valid JSON (no markdown, no preamble) in this exact shape:
{"captions":[{"id":1,"tone":"string","caption":"string","hashtags":["tag1"]}]}
Each caption object must have a non-empty caption string. Follow the user's language, tone, length, hashtag mode, and count exactly.`;
}

function formatCategoryFields(fields: CaptionFormInput["categoryFields"]): string {
  if (!fields) return "";
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(fields)) {
    if (raw == null || raw === "") continue;
    const value = Array.isArray(raw) ? raw.filter(Boolean).join(", ") : String(raw);
    if (!value) continue;
    const label = CATEGORY_FIELD_LABELS[key] ?? key;
    lines.push(`- ${label}: ${value}`);
  }
  return lines.join("\n");
}

export function buildCaptionUserMessage(data: CaptionFormInput): string {
  const audienceText = data.targetAudience.map((a) => AUDIENCE_LABELS[a] ?? a).join(", ");

  const variantsText =
    data.variants.length > 0 ? `Available in / colours & variants: ${data.variants.join(", ")}.` : "";

  const offerText = data.offer ? `Current offer: ${data.offer}.` : "";
  const uspText = data.usp ? `Key highlight to emphasize: ${data.usp}.` : "";
  const ctaText = CTA_TEXT[data.cta];
  const categoryFieldsText = formatCategoryFields(data.categoryFields);
  const categoryLine = data.categorySuper
    ? `${data.category} (${data.categorySuper})`
    : data.category;

  const platformLabel =
    data.platform === "whatsapp"
      ? "WhatsApp-first Indian sellers"
      : data.platform === "both"
        ? "Instagram and Facebook"
        : data.platform === "facebook"
          ? "Facebook"
          : "Instagram";

  return `You are writing for ${platformLabel}.

PRODUCT DETAILS:
- Name: ${data.productName}
- Category: ${categoryLine}
- Price: ₹${data.price}
- ${variantsText}
- ${offerText}
- ${uspText}${categoryFieldsText ? `\n\nPRODUCT SPECIFICS:\n${categoryFieldsText}` : ""}

TARGET AUDIENCE: ${audienceText}

WRITING RULES:
- ${LANGUAGE_INSTRUCTIONS[data.language]}
- Tone: ${TONE_INSTRUCTIONS[data.tone]}
- Length: ${LENGTH_INSTRUCTIONS[data.captionLength]}
- Hashtags: ${HASHTAG_INSTRUCTIONS[data.hashtagMode]}
- End the main caption body with a clear line that includes: "${ctaText}"
- Use emojis naturally — not excessively (max 4-5 per caption)
- Mention COD / easy ordering where it fits naturally
- Never use corporate language. Sound like a real person.
- Never mention competitor brands.

Generate exactly ${data.captionCount} distinct caption${data.captionCount > 1 ? "s" : ""}.
Each caption must feel distinct — different hook, different angle.

Output ONLY one JSON object with key "captions" (array of ${data.captionCount} items). No other keys.`;
}
