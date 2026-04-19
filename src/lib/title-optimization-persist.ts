import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { TitleFormInput } from "@/lib/schemas/title-optimizer";
import type { GeneratedTitleResult } from "@/types/title-optimizer";
import type { PlatformKey } from "@/lib/title-pipeline";

export async function persistTitleGeneration(
  sellerId: string,
  data: TitleFormInput,
  results: GeneratedTitleResult[],
  competitorJson?: Prisma.InputJsonValue
): Promise<{ optimizationId: string }> {
  const allKeys: PlatformKey[] = ["amazon", "flipkart", "meesho", "instagram"];
  const optimizedTitles = Object.fromEntries(
    allKeys.map((k) => {
      const hit = results.find((r) => r.platform === k);
      return [k, hit?.title?.trim() ?? ""];
    })
  ) as Record<PlatformKey, string>;

  const descriptions = results.map((r) => r.description?.trim()).filter(Boolean);
  const description = descriptions.join("\n\n---\n\n") || null;

  const kwSet = new Set<string>();
  for (const r of results) {
    for (const k of r.keywords ?? []) {
      const t = k.trim();
      if (t) kwSet.add(t);
    }
  }
  const keywordsUsed = Array.from(kwSet).slice(0, 40);

  const firstBefore = results.find((r) => typeof r.beforeScore === "number")?.beforeScore;
  const firstAfter = results.find((r) => typeof r.afterScore === "number")?.afterScore;
  const originalScoreInt =
    typeof firstBefore === "number" ? Math.min(100, Math.max(0, Math.round(firstBefore * 10))) : null;
  const optimizedScoreInt =
    typeof firstAfter === "number"
      ? Math.min(100, Math.max(0, Math.round(firstAfter * 10)))
      : Math.min(100, Math.max(0, (results[0]?.title.length ?? 0) > 0 ? 72 : 0));

  let nextVersion = 1;
  if (data.catalogProductId) {
    const last = await db.titleOptimization.findFirst({
      where: { productId: data.catalogProductId, sellerId },
      orderBy: { version: "desc" },
    });
    nextVersion = (last?.version ?? 0) + 1;
  }

  const insights = results[0]?.competitorInsights ?? [];
  const competitorStored: Prisma.InputJsonValue | undefined =
    insights.length || competitorJson
      ? ({
          insights,
          scrape: competitorJson ?? null,
          source: "title_generate_v2",
        } as unknown as Prisma.InputJsonValue)
      : undefined;

  const optimization = await db.titleOptimization.create({
    data: {
      sellerId,
      productId: data.catalogProductId ?? null,
      originalTitle: data.currentTitle?.trim() || null,
      originalScore: originalScoreInt,
      optimizedTitles: optimizedTitles as unknown as Prisma.InputJsonValue,
      optimizedScore: optimizedScoreInt,
      scoreBreakdown: {} as unknown as Prisma.InputJsonValue,
      description,
      bulletPoints: [],
      keywordsUsed,
      competitorAnalysis: competitorStored,
      language: data.language,
      version: nextVersion,
    },
  });

  if (data.catalogProductId) {
    await db.product.update({
      where: { id: data.catalogProductId },
      data: {
        optimizedTitles: optimizedTitles as unknown as Prisma.InputJsonValue,
        keywords: keywordsUsed,
      },
    });
  }

  return { optimizationId: optimization.id };
}
