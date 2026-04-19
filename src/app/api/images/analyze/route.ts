import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { nanoBananaAnalyzeProduct } from "@/lib/image-pipeline";
import { loadImageBufferForEdit } from "@/lib/s3-object-access";
import {
  PRODUCT_CATEGORY_VALUES,
  type ProductAnalysis,
  type ProductCategory,
} from "@/types/photo-studio";

export const runtime = "nodejs";
// Analysis is fast (2–4s typical) but vision occasionally takes longer on
// larger inputs; 60s is plenty and still well under route limits.
export const maxDuration = 60;

const bodySchema = z.object({
  imageUrl: z.string().url(),
});

const ALLOWED_CATEGORIES = new Set<ProductCategory>(PRODUCT_CATEGORY_VALUES);

const ANALYSIS_PROMPT = `You are an expert Amazon India product photographer and e-commerce specialist.
Analyze this product image and return a JSON object with the information below.
Respond with valid JSON ONLY — no explanation, no markdown, no backticks, no prose.

Schema:
{
  "productType": "exact product name (e.g. Apple Watch Ultra 2, Cotton Kurti, Red Lipstick)",
  "category": "one of: clothing_kurti | clothing_saree | clothing_western | clothing_kids | jewellery_gold | jewellery_fashion | bags_handbag | bags_backpack | footwear_heels | footwear_casual | electronics_watch | electronics_phone | electronics_audio | electronics_gadget | beauty_skincare | beauty_makeup | beauty_haircare | home_decor | food_packaged | general",
  "priceSegment": "budget | mid | premium | luxury",
  "primaryColor": "main colour of the product in plain words",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "targetGender": "men | women | unisex | kids",
  "photographyNotes": {
    "idealAngle": "best angle for this product (e.g. 3/4 front, flat lay, overhead)",
    "lightingStyle": "ideal lighting (e.g. bright studio, dramatic side light, soft diffused)",
    "backgroundRecommendation": "what backgrounds work best for this specific product",
    "commonMistakes": "what photographers typically get wrong for this product type",
    "amazonTopSellersUse": "how top Amazon India sellers photograph this exact product type"
  },
  "styleRecommendations": {
    "white_bg": "specific instruction for a white-background shot of THIS product",
    "close_up_front": "what to emphasise for a front-facing straight-on close-up of THIS product (product face / label / dial / neckline fills the frame)",
    "close_up": "what specific SIDE or ANGLE detail to close up on for THIS product — must look clearly different from the front-facing shot",
    "lifestyle_wood": "how THIS product should be styled on a wood surface",
    "lifestyle_marble": "how THIS product should be styled on marble",
    "lifestyle_outdoor": "how THIS product should be shown outdoors",
    "festive_diwali": "how THIS product should be styled for Diwali",
    "infographic": "what features to highlight in callouts for THIS product"
  },
  "doNotInclude": ["list of props/elements that would look wrong with this product"],
  "confidence": 0.95
}

Rules:
- Return ONLY the JSON object. No code fences, no commentary.
- If you are unsure, lower the "confidence" value accordingly.
- "confidence" must be a number between 0 and 1.
- "category" MUST be exactly one of the values listed above.`;

function sanitizeAnalysis(raw: unknown): ProductAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const categoryRaw = typeof obj.category === "string" ? obj.category : "";
  const category: ProductCategory = ALLOWED_CATEGORIES.has(
    categoryRaw as ProductCategory
  )
    ? (categoryRaw as ProductCategory)
    : "general";

  const priceSegment = ["budget", "mid", "premium", "luxury"].includes(
    String(obj.priceSegment)
  )
    ? (obj.priceSegment as ProductAnalysis["priceSegment"])
    : "mid";

  const targetGender = ["men", "women", "unisex", "kids"].includes(
    String(obj.targetGender)
  )
    ? (obj.targetGender as ProductAnalysis["targetGender"])
    : "unisex";

  const notesRaw =
    obj.photographyNotes && typeof obj.photographyNotes === "object"
      ? (obj.photographyNotes as Record<string, unknown>)
      : {};

  const photographyNotes: ProductAnalysis["photographyNotes"] = {
    idealAngle: String(notesRaw.idealAngle ?? ""),
    lightingStyle: String(notesRaw.lightingStyle ?? ""),
    backgroundRecommendation: String(notesRaw.backgroundRecommendation ?? ""),
    commonMistakes: String(notesRaw.commonMistakes ?? ""),
    amazonTopSellersUse: String(notesRaw.amazonTopSellersUse ?? ""),
  };

  const styleRecs =
    obj.styleRecommendations && typeof obj.styleRecommendations === "object"
      ? (obj.styleRecommendations as Partial<
          ProductAnalysis["styleRecommendations"]
        >)
      : {};

  const confidenceNum = Number(obj.confidence);
  const confidence = Number.isFinite(confidenceNum)
    ? Math.max(0, Math.min(1, confidenceNum))
    : 0.5;

  return {
    productType: String(obj.productType ?? "Unknown product"),
    category,
    priceSegment,
    primaryColor: String(obj.primaryColor ?? ""),
    keyFeatures: Array.isArray(obj.keyFeatures)
      ? obj.keyFeatures.map(String).slice(0, 8)
      : [],
    targetGender,
    photographyNotes,
    styleRecommendations: styleRecs as ProductAnalysis["styleRecommendations"],
    doNotInclude: Array.isArray(obj.doNotInclude)
      ? obj.doNotInclude.map(String).slice(0, 10)
      : [],
    confidence,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sellerId = session.user.id;

  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    // Server-side fetch avoids sending base64 over the wire from the browser.
    const buffer = await loadImageBufferForEdit(parsed.data.imageUrl, sellerId);
    const rawText = await nanoBananaAnalyzeProduct(buffer, ANALYSIS_PROMPT);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // Some models wrap JSON in ```json fences despite the responseMimeType
      // hint — try to salvage the first {...} block before giving up.
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Model returned non-JSON response");
      parsedJson = JSON.parse(match[0]);
    }

    const analysis = sanitizeAnalysis(parsedJson);
    if (!analysis) {
      return NextResponse.json({ analysis: null, fallback: true });
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[POST /api/images/analyze]", err);
    // Analysis failure must NOT block generation — return a null fallback
    // so the client can silently proceed with the default prompt.
    return NextResponse.json({ analysis: null, fallback: true });
  }
}
