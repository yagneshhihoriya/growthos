import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  detectProductSuperCategory,
  generateKeywords,
  generateTitlesAndDescription,
  scoreTitleWithGemini,
  scrapeCompetitorTitles,
} from "@/lib/title-pipeline";

const InputSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1).max(200),
  category: z.string().min(1),
  price: z.number().positive(),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  fabric: z.string().optional(),
  occasion: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.string()).optional(),
  ingredients: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  currentTitle: z.string().optional(),
  language: z.enum(["hinglish", "hindi", "english"]).default("hinglish"),
  includeCompetitorAnalysis: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = InputSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        Object.values(first).flat()[0] ??
        parsed.error.issues[0]?.message ??
        "Invalid request body";
      return NextResponse.json({ error: String(msg) }, { status: 400 });
    }

    const input = parsed.data;
    const sellerId = session.user.id;

    let nextVersion = 1;
    const currentTitle: string | null = input.currentTitle?.trim() || null;

    if (input.productId) {
      const product = await db.product.findFirst({
        where: { id: input.productId, sellerId },
      });
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      const lastOptimization = await db.titleOptimization.findFirst({
        where: { productId: input.productId, sellerId },
        orderBy: { version: "desc" },
      });
      nextVersion = (lastOptimization?.version ?? 0) + 1;
    }

    const keywordData = await generateKeywords(input.productName, input.category, input.language);

    let competitorAnalysis: Awaited<ReturnType<typeof scrapeCompetitorTitles>> | null = null;
    if (input.includeCompetitorAnalysis) {
      try {
        competitorAnalysis = await scrapeCompetitorTitles(input.productName, input.category);
      } catch {
        competitorAnalysis = {
          sharedKeywords: [],
          gapKeywords: [],
          topTitles: [],
          source: "scrape_failed",
          error: "Unexpected scrape error",
        };
      }
    }

    let originalScore: Awaited<ReturnType<typeof scoreTitleWithGemini>> | null = null;
    if (currentTitle) {
      originalScore = await scoreTitleWithGemini(currentTitle, input.category, keywordData);
    }

    const generation = await generateTitlesAndDescription({
      productName: input.productName,
      category: input.category,
      price: input.price,
      colors: input.colors,
      sizes: input.sizes,
      fabric: input.fabric,
      occasion: input.occasion,
      specs: input.specs,
      ingredients: input.ingredients,
      weight: input.weight,
      dimensions: input.dimensions,
      language: input.language,
      keywordData,
      competitorAnalysis,
    });

    const optimizedScore = await scoreTitleWithGemini(
      generation.titles.meesho,
      input.category,
      keywordData
    );

    const optimization = await db.titleOptimization.create({
      data: {
        sellerId,
        productId: input.productId ?? null,
        originalTitle: currentTitle,
        originalScore: originalScore?.total ?? null,
        optimizedTitles: generation.titles as unknown as Prisma.InputJsonValue,
        optimizedScore: optimizedScore.total,
        scoreBreakdown: optimizedScore.breakdown as unknown as Prisma.InputJsonValue,
        description: generation.description,
        bulletPoints: generation.bulletPoints,
        keywordsUsed: generation.keywordsUsed,
        keywordData: keywordData as unknown as Prisma.InputJsonValue,
        competitorAnalysis: competitorAnalysis
          ? (competitorAnalysis as unknown as Prisma.InputJsonValue)
          : undefined,
        language: input.language,
        version: nextVersion,
      },
    });

    if (input.productId) {
      await db.product.update({
        where: { id: input.productId },
        data: {
          optimizedTitles: generation.titles as unknown as Prisma.InputJsonValue,
          keywords: generation.keywordsUsed,
        },
      });
    }

    const improvement =
      originalScore != null ? optimizedScore.total - originalScore.total : null;

    const superCategory =
      generation.superCategory ?? detectProductSuperCategory(input.category, input.productName);

    return NextResponse.json({
      optimization,
      originalScore,
      optimizedScore,
      improvement,
      superCategory,
    });
  } catch (err) {
    console.error("[api/titles/optimize]", err);
    const message = err instanceof Error ? err.message : "Optimization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
