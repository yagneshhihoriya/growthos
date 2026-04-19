import { GoogleGenAI } from "@google/genai";

const TITLE_MODEL =
  process.env.GEMINI_TITLE_MODEL?.trim() ||
  process.env.GEMINI_CAPTION_MODEL?.trim() ||
  "gemini-2.5-flash";
const TITLE_FALLBACK_MODEL =
  process.env.GEMINI_TITLE_FALLBACK_MODEL?.trim() ||
  process.env.GEMINI_CAPTION_FALLBACK_MODEL?.trim() ||
  "gemini-2.0-flash";

export const PLATFORM_CHAR_LIMITS = {
  amazon: 200,
  flipkart: 120,
  meesho: 100,
  instagram: 150,
} as const;

export type PlatformKey = keyof typeof PLATFORM_CHAR_LIMITS;

export type SuperCategory =
  | "clothing"
  | "electronics"
  | "beauty"
  | "footwear"
  | "bags"
  | "jewellery"
  | "home"
  | "kids"
  | "stationery"
  | "health"
  | "food"
  | "pets"
  | "general";

export type KeywordRow = {
  keyword: string;
  estimatedVolume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  type: string;
  relevanceScore: number;
};

export type CompetitorAnalysis = {
  sharedKeywords: string[];
  gapKeywords: string[];
  topTitles: string[];
  source: string;
  insight?: string;
  error?: string;
};

export type TitleGenerationPayload = {
  productName: string;
  category: string;
  price: number;
  colors: string[];
  sizes: string[];
  fabric?: string;
  occasion: string[];
  specs?: Record<string, string>;
  ingredients?: string;
  weight?: string;
  dimensions?: string;
  language: "hinglish" | "hindi" | "english";
  keywordData: KeywordRow[];
  competitorAnalysis: CompetitorAnalysis | null;
};

export type PlatformTitles = Record<PlatformKey, string>;

export type GenerationResult = {
  titles: PlatformTitles;
  description: string;
  bulletPoints: string[];
  keywordsUsed: string[];
  superCategory: SuperCategory;
};

export type ScoreResult = {
  total: number;
  breakdown: Record<string, number>;
  feedback: string;
};

function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

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

async function callGeminiJson(system: string, user: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: TITLE_MODEL, delayMs: 0 },
    { model: TITLE_MODEL, delayMs: 800 },
    { model: TITLE_MODEL, delayMs: 2000 },
    { model: TITLE_FALLBACK_MODEL, delayMs: 500 },
  ];
  let lastErr: unknown = null;
  for (const { model, delayMs } of attempts) {
    if (delayMs) await sleep(delayMs);
    try {
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
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[title-pipeline] transient error on ${model}, retrying`, err);
    }
  }
  throw lastErr ?? new Error("Title pipeline Gemini call failed after retries");
}

export function detectProductSuperCategory(category: string, productName: string): SuperCategory {
  const input = `${category} ${productName}`.toLowerCase();
  if (
    /saree|kurti|lehenga|dupatta|suit|kurta|churidar|salwar|anarkali|fabric|silk|cotton wear|ethnic|garment|cloth|dress|shirt|trouser|jeans|jacket|sweater|hoodie|t-shirt|tshirt|top|blouse|skirt|pant|lingerie|innerwear|nightwear|pyjama|socks|underwear/.test(
      input
    )
  )
    return "clothing";
  if (
    /phone|mobile|laptop|tablet|headphone|earphone|speaker|charger|cable|power bank|smartwatch|camera|computer|keyboard|mouse|monitor|tv|television|printer|router|hard disk|pendrive|memory|electronic|gadget|appliance|refrigerator|washing machine|microwave|ac|cooler|fan|iron|mixer|juicer/.test(
      input
    )
  )
    return "electronics";
  if (
    /cream|serum|moisturizer|sunscreen|lipstick|foundation|mascara|kajal|eyeliner|blush|concealer|powder|perfume|deodorant|shampoo|conditioner|hair oil|face wash|toner|lotion|soap|body wash|nail polish|makeup|beauty|skincare|haircare|cosmetic/.test(
      input
    )
  )
    return "beauty";
  if (/shoe|sandal|slipper|boot|heel|sneaker|footwear|chappal/.test(input)) return "footwear";
  if (/bag|purse|wallet|handbag|backpack|luggage|suitcase|clutch/.test(input)) return "bags";
  if (/necklace|earring|ring|bracelet|bangle|anklet|pendant|jewellery|jewelry|gold|silver|diamond/.test(input))
    return "jewellery";
  if (
    /chair|table|bed|sofa|shelf|wardrobe|cabinet|curtain|pillow|mattress|bedsheet|blanket|furniture|home decor|lamp|clock/.test(
      input
    )
  )
    return "home";
  if (/toy|game|puzzle|doll|cycle|scooter|kids|baby|child|infant/.test(input)) return "kids";
  if (/book|stationery|pen|notebook|diary/.test(input)) return "stationery";
  if (/protein|supplement|vitamin|medicine|health|fitness|gym|yoga|ayurvedic/.test(input)) return "health";
  if (/food|snack|spice|masala|pickle|dry fruit|grocery|tea|coffee|biscuit/.test(input)) return "food";
  if (/pet|dog|cat|aquarium|bird/.test(input)) return "pets";
  return "general";
}

export function getCategoryDescriptionRequirements(superCategory: SuperCategory): string {
  const requirements: Record<SuperCategory, string> = {
    clothing: `Bullet points must cover:
1. "Fabric & Feel: [fabric type, texture, weight, breathability]"
2. "Size & Fit: [size chart with chest/waist/length in both INCHES and CM for each size, true-to-size or size up advice]"
3. "Occasion & Style: [when to wear, how to style, what to pair with]"
4. "Care Instructions: [wash temperature, hand/machine wash, ironing, dry cleaning, do not bleach]"
5. "Why Buy From Us: [quality assurance, COD available, easy returns, fast delivery]"
Description must mention: fabric composition, fit type (regular/slim/loose), color options, occasion suitability.`,
    electronics: `Bullet points must cover:
1. "Key Specifications: [main tech specs — RAM, storage, battery, processor, screen size etc as applicable]"
2. "What's In The Box: [list every item in the box — device, charger, cable, manual, warranty card etc]"
3. "Compatibility: [which devices/OS/versions it works with, if applicable]"
4. "Warranty & Support: [warranty period, brand support, what's covered]"
5. "Why Buy From Us: [genuine product, COD available, easy returns, authorized seller]"
Description must mention: brand name, model number if applicable, key differentiating features, power requirements if applicable.
DO NOT include size guide or fabric details.`,
    beauty: `Bullet points must cover:
1. "Key Ingredients / Formula: [active ingredients, what they do, skin type suitability]"
2. "How To Use: [step-by-step application instructions, quantity to use, frequency]"
3. "Skin Type & Concerns: [which skin types it suits, which skin concerns it addresses]"
4. "Quantity & Shelf Life: [product weight/volume, shelf life after opening]"
5. "Why Buy From Us: [dermatologist tested if applicable, cruelty-free, COD, easy returns]"
Description must mention: free from harmful chemicals (parabens, sulphates etc if true), fragrance info, dermatologist tested status if applicable.
DO NOT include size guide or fabric details.`,
    footwear: `Bullet points must cover:
1. "Material & Build: [upper material, sole material, closure type — lace/velcro/slip-on]"
2. "Size Guide: [Indian size to UK/EU/US conversion, foot length in CM for each size, width fitting]"
3. "Comfort & Support: [cushioning, arch support, insole material, suitable for daily/sports/occasion use]"
4. "Occasion: [casual/formal/sports/party — what to wear it with]"
5. "Care & Maintenance: [how to clean, store, maintain]"`,
    bags: `Bullet points must cover:
1. "Material & Finish: [outer material, lining material, hardware finish]"
2. "Dimensions & Capacity: [L x W x H in cm and inches, litres if applicable, what fits inside]"
3. "Compartments & Organisation: [number of pockets, zipper vs magnetic closure, laptop sleeve if applicable]"
4. "Occasion & Style: [casual/office/travel/party, what outfits it goes with]"
5. "Care Instructions: [how to clean, store, avoid]"`,
    jewellery: `Bullet points must cover:
1. "Material & Purity: [metal type — gold/silver/brass/alloy, plating details, stone type if applicable]"
2. "Dimensions: [length, diameter, weight in grams]"
3. "Occasion: [traditional/contemporary/bridal/daily wear, what to pair with]"
4. "Skin Safety: [hypoallergenic, nickel-free if applicable, suitable for sensitive skin]"
5. "Care Instructions: [how to store, clean, avoid water/chemicals]"`,
    home: `Bullet points must cover:
1. "Material & Build Quality: [materials used, finish, durability]"
2. "Dimensions: [exact L x W x H in both cm and inches, weight]"
3. "Assembly & Installation: [self-assembly/no-assembly needed, tools required, time to assemble]"
4. "Usage & Placement: [rooms suitable for, load capacity if applicable, indoor/outdoor]"
5. "Care & Maintenance: [cleaning instructions, warranty]"`,
    kids: `Bullet points must cover:
1. "Age Group & Safety: [recommended age, safety certifications — BIS/CE, choking hazard warning if applicable]"
2. "Material: [non-toxic, BPA-free, fabric details for clothing/soft toys]"
3. "Size / Dimensions: [size for clothing, dimensions for toys/products]"
4. "Educational / Play Value: [skills developed, how it engages children]"
5. "Care Instructions: [washable, battery requirements if applicable, storage]"`,
    health: `Bullet points must cover:
1. "Key Ingredients / Composition: [active ingredients, dosage per serving if applicable]"
2. "Benefits & Usage: [what it does, who should use it, how to use]"
3. "Dosage & Safety: [recommended dosage, who should avoid, consult doctor note]"
4. "Quantity & Shelf Life: [number of servings/units, expiry info]"
5. "Quality Assurance: [certifications — FSSAI/GMP/ISO, made in India if applicable]"`,
    food: `Bullet points must cover:
1. "Ingredients & Allergens: [full ingredient list, allergen warnings]"
2. "Nutritional Info: [calories, key nutrients per serving]"
3. "Taste & Usage: [flavour profile, how to use/eat/cook]"
4. "Quantity & Shelf Life: [net weight, best before, storage instructions]"
5. "Quality & Certifications: [FSSAI licence, organic/natural if applicable, preservative-free]"`,
    stationery: `Bullet points must cover:
1. "Product Details: [key features and specifications]"
2. "What's In The Box: [everything included]"
3. "Usage & Application: [how to use, who it's for]"
4. "Quality & Material: [build quality, materials, durability]"
5. "Why Buy: [COD available, easy returns, quality guarantee]"`,
    pets: `Bullet points must cover:
1. "Product Details: [key features and specifications]"
2. "What's In The Box: [everything included]"
3. "Usage & Application: [how to use, who it's for]"
4. "Quality & Material: [build quality, materials, durability]"
5. "Why Buy: [COD available, easy returns, quality guarantee]"`,
    general: `Bullet points must cover:
1. "Product Details: [key features and specifications]"
2. "What's In The Box: [everything included]"
3. "Usage & Application: [how to use, who it's for]"
4. "Quality & Material: [build quality, materials, durability]"
5. "Why Buy: [COD available, easy returns, quality guarantee]"`,
  };
  return requirements[superCategory] ?? requirements.general;
}

function parseJsonArray<T>(raw: string): T[] | null {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as unknown;
    return Array.isArray(arr) ? (arr as T[]) : null;
  } catch {
    return null;
  }
}

function parseJsonObject<T extends Record<string, unknown>>(raw: string): T | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export async function generateKeywords(
  productName: string,
  category: string,
  language: string
): Promise<KeywordRow[]> {
  const superCategory = detectProductSuperCategory(category, productName);
  const categoryContext: Record<string, string> = {
    clothing: "Indian clothing & fashion marketplace (Meesho, Flipkart, Myntra, Amazon Fashion)",
    electronics: "Indian electronics marketplace (Amazon India, Flipkart, Croma)",
    beauty: "Indian beauty & personal care marketplace (Nykaa, Amazon India, Flipkart)",
    footwear: "Indian footwear marketplace (Myntra, Amazon, Flipkart)",
    home: "Indian home & furniture marketplace (Amazon India, Flipkart, Pepperfry)",
    food: "Indian grocery & food marketplace (Amazon Pantry, BigBasket, Flipkart)",
    health: "Indian health & wellness marketplace (PharmEasy, Amazon India, Flipkart)",
    general: "Indian marketplace (Amazon India, Flipkart, Meesho)",
  };
  const ctx = categoryContext[superCategory] ?? categoryContext.general;
  const system = `You output only valid JSON arrays. No markdown, no commentary.`;
  const user = `You are an expert in Indian marketplace SEO for ${ctx}.
Generate keyword data for this product:
Product: ${productName}
Category: ${category}
Super-category: ${superCategory}

Return ONLY valid JSON array:
[
  {
    "keyword": "example search term",
    "estimatedVolume": "high|medium|low",
    "competition": "high|medium|low",
    "type": "broad|category|niche|location|trending",
    "relevanceScore": 95
  }
]

Generate exactly 20 keywords. Mix: 5 broad, 5 category-specific, 5 niche/long-tail, 3 location-based (India, relevant city/region), 2 trending.
Focus on how Indian buyers actually search on ${
    superCategory === "clothing"
      ? "Meesho and Flipkart"
      : superCategory === "electronics"
        ? "Amazon India and Flipkart"
        : "Indian marketplaces"
  }.
Include Hinglish search terms where Indian buyers naturally use them.
Language context for titles/descriptions: ${language}.
DO NOT generate clothing/fabric keywords for non-clothing products.`;

  try {
    const raw = await callGeminiJson(system, user);
    const parsed = parseJsonArray<KeywordRow>(raw);
    if (!parsed || parsed.length === 0) return [];
    return parsed
      .filter((k) => k && typeof k.keyword === "string")
      .map((k) => ({
        keyword: String(k.keyword),
        estimatedVolume: (["high", "medium", "low"].includes(String(k.estimatedVolume))
          ? k.estimatedVolume
          : "medium") as KeywordRow["estimatedVolume"],
        competition: (["high", "medium", "low"].includes(String(k.competition))
          ? k.competition
          : "medium") as KeywordRow["competition"],
        type: typeof k.type === "string" ? k.type : "broad",
        relevanceScore: typeof k.relevanceScore === "number" ? k.relevanceScore : 50,
      }));
  } catch {
    return [];
  }
}

async function analyzeScrapedTitlesWithGemini(titles: string[], category: string): Promise<CompetitorAnalysis> {
  const system = `You output only valid JSON objects. No markdown.`;
  const user = `Analyze these top-ranking ${category} product titles from Meesho:

${titles.join("\n")}

Return ONLY valid JSON:
{
  "sharedKeywords": ["keywords that appear in 3+ titles — mandatory to include"],
  "gapKeywords": ["important keywords that NO title uses — opportunity to stand out"],
  "topTitles": ["the 3 best-performing looking titles"],
  "insight": "one sentence about the pattern you see"
}`;
  try {
    const raw = await callGeminiJson(system, user);
    const obj = parseJsonObject<{
      sharedKeywords?: string[];
      gapKeywords?: string[];
      topTitles?: string[];
      insight?: string;
    }>(raw);
    if (!obj) {
      return {
        sharedKeywords: [],
        gapKeywords: [],
        topTitles: titles.slice(0, 3),
        source: "scraped_parse_error",
      };
    }
    return {
      sharedKeywords: Array.isArray(obj.sharedKeywords) ? obj.sharedKeywords : [],
      gapKeywords: Array.isArray(obj.gapKeywords) ? obj.gapKeywords : [],
      topTitles: Array.isArray(obj.topTitles) ? obj.topTitles : titles.slice(0, 3),
      insight: obj.insight,
      source: "scraped",
    };
  } catch {
    return {
      sharedKeywords: [],
      gapKeywords: [],
      topTitles: titles.slice(0, 3),
      source: "scraped_parse_error",
    };
  }
}

export async function scrapeCompetitorTitles(
  productName: string,
  category: string
): Promise<CompetitorAnalysis> {
  const apiKey = process.env.SCRAPER_API_KEY?.trim();
  if (!apiKey) {
    return {
      sharedKeywords: ["cotton", "women", "ethnic", "daily wear", "festive"],
      gapKeywords: ["comfortable", "pocket", "plus size", "COD", "fast delivery"],
      topTitles: [],
      source: "mock_no_api_key",
      insight: "Add SCRAPER_API_KEY for live Meesho search results.",
    };
  }

  try {
    const searchUrl = `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`;
    const scraperUrl = `http://api.scraperapi.com?api_key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(searchUrl)}&render=true`;
    const response = await fetch(scraperUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      return {
        sharedKeywords: [],
        gapKeywords: [],
        topTitles: [],
        source: "scrape_failed",
        error: `ScraperAPI failed: ${response.status}`,
      };
    }
    const html = await response.text();
    const titleMatches = html.match(/"productName":"([^"]+)"/g) || [];
    const titles = titleMatches
      .map((m) => m.replace(/^"productName":"/, "").replace(/"$/, ""))
      .filter(Boolean)
      .slice(0, 10);

    if (titles.length === 0) {
      return { sharedKeywords: [], gapKeywords: [], topTitles: [], source: "scraped_empty" };
    }
    return analyzeScrapedTitlesWithGemini(titles, category);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[title-pipeline] competitor scrape:", msg);
    return {
      sharedKeywords: [],
      gapKeywords: [],
      topTitles: [],
      source: "scrape_failed",
      error: msg,
    };
  }
}

function buildProductDetailsBlock(input: TitleGenerationPayload): string {
  const sc = detectProductSuperCategory(input.category, input.productName);
  const lines = [
    `- Name: ${input.productName}`,
    `- Category: ${input.category}`,
    `- Price: ₹${input.price}`,
    input.colors?.length ? `- Colors/Variants: ${input.colors.join(", ")}` : "",
    input.sizes?.length && ["clothing", "footwear", "kids"].includes(sc)
      ? `- Available Sizes: ${input.sizes.join(", ")}`
      : "",
    input.fabric && sc === "clothing" ? `- Fabric/Material: ${input.fabric}` : "",
    input.occasion?.length && ["clothing", "footwear", "jewellery", "bags"].includes(sc)
      ? `- Occasion: ${input.occasion.join(", ")}`
      : "",
    input.dimensions ? `- Dimensions: ${input.dimensions}` : "",
    input.weight ? `- Weight: ${input.weight}` : "",
    input.ingredients ? `- Ingredients: ${input.ingredients}` : "",
    input.specs && Object.keys(input.specs).length
      ? `- Specs: ${Object.entries(input.specs)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function clampTitle(text: string, limit: number): string {
  const t = (text ?? "").trim();
  if (t.length <= limit) return t;
  const ellipsis = "…";
  const max = Math.max(1, limit - ellipsis.length);
  return t.slice(0, max) + ellipsis;
}

export function enforcePlatformCharLimits(titles: Partial<Record<PlatformKey, string>>): PlatformTitles {
  const keys: PlatformKey[] = ["amazon", "flipkart", "meesho", "instagram"];
  const out = {} as PlatformTitles;
  for (const k of keys) {
    const lim = PLATFORM_CHAR_LIMITS[k];
    out[k] = clampTitle(typeof titles[k] === "string" ? titles[k]! : "", lim);
  }
  return out;
}

export async function generateTitlesAndDescription(input: TitleGenerationPayload): Promise<GenerationResult> {
  const superCategory = detectProductSuperCategory(input.category, input.productName);
  const descriptionRequirements = getCategoryDescriptionRequirements(superCategory);
  const charLimits = PLATFORM_CHAR_LIMITS;

  const topKeywords = [...input.keywordData]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10)
    .map((k) => k.keyword);

  const shared = input.competitorAnalysis?.sharedKeywords?.slice(0, 5).join(", ") || "";
  const gaps = input.competitorAnalysis?.gapKeywords?.slice(0, 3).join(", ") || "";

  const system = `You are an expert Indian marketplace SEO copywriter. Output only valid JSON matching the schema.`;
  const user = `Generate product listings for an Indian seller.

Product Type: ${superCategory.toUpperCase()} product
${buildProductDetailsBlock(input)}

SEO Intelligence:
- Top keywords by relevance: ${topKeywords.join(", ")}
- Mandatory keywords (from competitor overlap): ${shared || "none identified"}
- Gap keywords (opportunity): ${gaps || "none identified"}

Character limits: Amazon=${charLimits.amazon}, Flipkart=${charLimits.flipkart}, Meesho=${charLimits.meesho}, Instagram=${charLimits.instagram}
Language for description + bullets: ${input.language} (Hinglish = natural mix of Hindi and English as Indian sellers speak)

TITLE RULES:
- MUST respect character limits strictly (count characters)
- Never use "premium quality", "best product", "top selling"
- Titles describe the actual product

DESCRIPTION + BULLET POINTS RULES:
${descriptionRequirements}
- Description: 250-300 words in ${input.language}
- Never include information that doesn't apply to this product type

Return ONLY valid JSON:
{
  "titles": {
    "amazon": "title max ${charLimits.amazon} chars",
    "flipkart": "title max ${charLimits.flipkart} chars",
    "meesho": "title max ${charLimits.meesho} chars",
    "instagram": "engaging hook max ${charLimits.instagram} chars"
  },
  "description": "250-300 word description",
  "bulletPoints": ["Section 1: ...", "Section 2: ...", "Section 3: ...", "Section 4: ...", "Section 5: ..."],
  "keywordsUsed": ["keyword1", "keyword2", "keyword3"],
  "superCategory": "${superCategory}"
}`;

  const raw = await callGeminiJson(system, user);
  const obj = parseJsonObject<{
    titles?: Partial<Record<PlatformKey, string>>;
    description?: string;
    bulletPoints?: string[];
    keywordsUsed?: string[];
    superCategory?: string;
  }>(raw);
  if (!obj || !obj.titles) {
    throw new Error("Gemini returned invalid JSON for title generation");
  }

  const titles = enforcePlatformCharLimits(obj.titles);
  const bulletPoints = Array.isArray(obj.bulletPoints)
    ? obj.bulletPoints.map(String).filter(Boolean).slice(0, 8)
    : [];
  const keywordsUsed = Array.isArray(obj.keywordsUsed) ? obj.keywordsUsed.map(String).filter(Boolean) : topKeywords.slice(0, 15);
  const desc = typeof obj.description === "string" ? obj.description : "";
  const scOut =
    obj.superCategory && typeof obj.superCategory === "string"
      ? (obj.superCategory as SuperCategory)
      : superCategory;

  return {
    titles,
    description: desc,
    bulletPoints,
    keywordsUsed,
    superCategory: ["clothing", "electronics", "beauty", "footwear", "bags", "jewellery", "home", "kids", "stationery", "health", "food", "pets", "general"].includes(
      scOut
    )
      ? scOut
      : superCategory,
  };
}

export async function scoreTitleWithGemini(
  title: string,
  category: string,
  keywordData: KeywordRow[]
): Promise<ScoreResult> {
  const keywords = keywordData.slice(0, 10).map((k) => k.keyword);
  const system = `You output only valid JSON. Score dimensions 0-20 each; total must equal sum of five dimensions (0-100).`;
  const user = `Score this Indian marketplace product title (0-100 total) across 5 dimensions:

Title: "${title.replace(/"/g, "'")}"
Category: ${category}
Target keywords: ${keywords.join(", ")}

Return ONLY valid JSON:
{
  "keywordDensity": 15,
  "charUtilization": 15,
  "clarity": 15,
  "emotionalHook": 15,
  "compliance": 15,
  "total": 75,
  "feedback": "One sentence of the most impactful improvement"
}`;

  try {
    const raw = await callGeminiJson(system, user);
    const scores = parseJsonObject<{
      keywordDensity?: number;
      charUtilization?: number;
      clarity?: number;
      emotionalHook?: number;
      compliance?: number;
      total?: number;
      feedback?: string;
    }>(raw);
    if (!scores || typeof scores.total !== "number") {
      return { total: 0, breakdown: {}, feedback: "Could not score this title" };
    }
    return {
      total: Math.min(100, Math.max(0, Math.round(scores.total))),
      breakdown: {
        keywordDensity: Number(scores.keywordDensity ?? 0),
        charUtilization: Number(scores.charUtilization ?? 0),
        clarity: Number(scores.clarity ?? 0),
        emotionalHook: Number(scores.emotionalHook ?? 0),
        compliance: Number(scores.compliance ?? 0),
      },
      feedback: typeof scores.feedback === "string" ? scores.feedback : "",
    };
  } catch {
    return { total: 0, breakdown: {}, feedback: "Could not score this title" };
  }
}

/** Single-call Gemini listing for bulk CSV rows (no competitor scrape). */
export type BulkRowListing = {
  titles: PlatformTitles;
  description: string;
  bullets: string[];
  keywords: string[];
  score: number;
};

export async function generateBulkRowListing(params: {
  productName: string;
  category: string;
  price: number;
  colors?: string;
  sizes?: string;
  fabric?: string;
  currentTitle?: string;
  language: string;
}): Promise<BulkRowListing> {
  const superCategory = detectProductSuperCategory(params.category, params.productName);
  const system = `You output only valid JSON. Expert Indian marketplace SEO copywriter.`;
  const user = `Generate optimized marketplace titles + description for one product.

Product: ${params.productName}
Category: ${params.category} (super-category: ${superCategory})
Price: ₹${params.price}
${params.colors ? `Colors: ${params.colors}` : ""}
${params.sizes && ["clothing", "footwear", "kids"].includes(superCategory) ? `Sizes: ${params.sizes}` : ""}
${params.fabric && superCategory === "clothing" ? `Fabric: ${params.fabric}` : ""}
${params.currentTitle ? `Current title to improve on: ${params.currentTitle}` : ""}
Output language style: ${params.language} (Hinglish = natural Hindi + English mix)

Return ONLY valid JSON:
{
  "amazon": "max 200 chars",
  "flipkart": "max 120 chars",
  "meesho": "max 100 chars",
  "instagram": "max 150 chars",
  "description": "about 150 words",
  "bullets": ["Section: detail", "Section: detail", "Section: detail", "Section: detail", "Section: detail"],
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "score": 0
}
Score 0-100 for overall listing quality.`;

  const raw = await callGeminiJson(system, user);
  const obj = parseJsonObject<{
    amazon?: string;
    flipkart?: string;
    meesho?: string;
    instagram?: string;
    description?: string;
    bullets?: string[];
    keywords?: string[];
    score?: number;
  }>(raw);
  if (!obj) throw new Error("Gemini returned invalid JSON");

  const titles = enforcePlatformCharLimits({
    amazon: obj.amazon,
    flipkart: obj.flipkart,
    meesho: obj.meesho,
    instagram: obj.instagram,
  });
  const bullets = Array.isArray(obj.bullets) ? obj.bullets.map(String).filter(Boolean).slice(0, 5) : [];
  const keywords = Array.isArray(obj.keywords) ? obj.keywords.map(String).filter(Boolean).slice(0, 12) : [];
  const description = typeof obj.description === "string" ? obj.description : "";
  const score = typeof obj.score === "number" ? Math.min(100, Math.max(0, Math.round(obj.score))) : 0;

  return { titles, description, bullets, keywords, score };
}

/** Plain-text completion (no JSON schema) — used by multi-platform title form. */
export async function callGeminiPlainText(system: string, user: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: TITLE_MODEL, delayMs: 0 },
    { model: TITLE_MODEL, delayMs: 800 },
    { model: TITLE_MODEL, delayMs: 2000 },
    { model: TITLE_FALLBACK_MODEL, delayMs: 500 },
  ];
  let lastErr: unknown = null;
  for (const { model, delayMs } of attempts) {
    if (delayMs) await sleep(delayMs);
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: user }] }],
        config: {
          systemInstruction: system,
          maxOutputTokens: 8192,
        },
      });
      const text = typeof res.text === "string" ? res.text : "";
      if (!text) throw new Error("Gemini returned empty response");
      return text;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      console.warn(`[title-pipeline] transient error on ${model} (plain text), retrying`, err);
    }
  }
  throw lastErr ?? new Error("Gemini plain-text call failed after retries");
}
