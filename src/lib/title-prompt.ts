import type { TitleFormInput } from "@/lib/schemas/title-optimizer";
import { PLATFORM_CONFIG, type TitlePlatform } from "@/types/title-optimizer";

const PLATFORM_RULES: Record<TitlePlatform, string> = {
  amazon: `Amazon title rules:
  - Max 200 characters
  - Format: [Brand] + [Product Type] + [Key Feature] + [Size/Color/Variant] + [Use Case]
  - Include 3-5 high-volume search keywords naturally
  - No promotional phrases ("Best", "Cheapest", "#1")
  - No special characters except commas and pipes (|)
  - Capitalise each word`,

  flipkart: `Flipkart title rules:
  - Max 255 characters
  - Include brand, product name, key specs, size range, color
  - Target keywords used by Indian shoppers
  - More descriptive than Amazon — can include material and occasion`,

  meesho: `Meesho title rules:
  - Max 100 characters — be concise
  - Hinglish-friendly — mix Hindi keywords like "kurti", "suit", "set"
  - Focus on style, color, occasion
  - Must include at least one size indicator`,

  instagram: `Instagram caption rules:
  - Engaging hook in first line (visible before "more")
  - Conversational tone — sounds like a real person
  - Include price and offer naturally in the body
  - End with clear CTA
  - Add 15-20 relevant hashtags at the end`,
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  hinglish:
    "Use Hinglish where appropriate — mix English keywords with Hindi product words. Indian buyers search in both.",
  hindi: "Use Hindi (Devanagari) for descriptions. Keep title keywords in English for searchability.",
  english: "Standard Indian English. Avoid overly formal or British phrasing.",
};

const OUTPUT_INSTRUCTIONS: Record<string, string> = {
  title_and_desc:
    "Generate: (1) optimised title, (2) 3-4 line product description ready to paste, (3) 10 search keywords ranked by estimated volume",
  title_only: "Generate: (1) optimised title only. No description needed.",
  keywords:
    "Generate: (1) optimised title, (2) 15 search keywords with estimated monthly search volume for each",
};

export function buildTitlePrompt(data: TitleFormInput, competitorData?: string): string {
  const platformSections = data.platforms
    .map((p) => {
      const config = PLATFORM_CONFIG[p];
      return `
=== ${config.label.toUpperCase()} (${config.limitLabel}) ===
${PLATFORM_RULES[p]}`;
    })
    .join("\n");

  const variantsText =
    data.variants.length > 0 ? `Available variants: ${data.variants.join(", ")}` : "";

  const currentTitleSection = data.currentTitle
    ? `CURRENT TITLE TO IMPROVE:
"${data.currentTitle}"
Rate the current title out of 10 for SEO quality. Then provide the improved version and rate that too.`
    : "";

  const competitorSection = competitorData
    ? `COMPETITOR ANALYSIS DATA:
${competitorData}
Use this to identify keyword gaps and incorporate missing high-value terms.`
    : "";

  return `You are an expert Indian e-commerce SEO copywriter specialising in marketplace titles for Amazon India, Flipkart, Meesho, and Instagram sellers.

PRODUCT DETAILS:
- Name: ${data.productName}
- Category: ${data.category}
- Price: ₹${data.price}
- ${variantsText}

${currentTitleSection}

PLATFORM REQUIREMENTS:
${platformSections}

LANGUAGE STYLE:
${LANGUAGE_INSTRUCTIONS[data.language]}

OUTPUT REQUIRED:
${OUTPUT_INSTRUCTIONS[data.outputType]}

${competitorSection}

RESPONSE FORMAT (follow exactly):
For each platform, use this structure:

[PLATFORM: Amazon]
TITLE: <optimised title here>
CHAR COUNT: <number>
${data.currentTitle ? "BEFORE SCORE: <X>/10\nAFTER SCORE: <Y>/10\n" : ""}${data.outputType !== "title_only" ? "DESCRIPTION:\n<description here>\n\nKEYWORDS:\n1. keyword — est. volume\n2. keyword — est. volume\n..." : ""}

Use the exact platform label in brackets matching: ${data.platforms.map((p) => PLATFORM_CONFIG[p].label).join(", ")} — e.g. [PLATFORM: ${PLATFORM_CONFIG[data.platforms[0]!].label}].

Repeat for each platform requested in the same order: ${data.platforms.map((p) => PLATFORM_CONFIG[p].label).join(" → ")}.

End with:
COMPETITOR INSIGHTS
- <insight 1>
- <insight 2>
- <insight 3>
(If competitor data was not provided, still output COMPETITOR INSIGHTS with three generic SEO tips for this product instead.)

Output ONLY the structured result. No preamble, no commentary.`;
}
