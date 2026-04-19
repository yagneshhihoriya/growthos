import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TitleFormSchema } from "@/lib/schemas/title-optimizer";
import { buildTitlePrompt } from "@/lib/title-prompt";
import { parseTitleGenerationOutput } from "@/lib/parse-title-generation-output";
import { callGeminiPlainText, scrapeCompetitorTitles } from "@/lib/title-pipeline";
import { isTitleGenerationRateLimited } from "@/lib/title-generation-rate-limit";
import { persistTitleGeneration } from "@/lib/title-optimization-persist";
import type { TitleFormInput } from "@/lib/schemas/title-optimizer";
import type { GeneratedTitleResult } from "@/types/title-optimizer";
import type { TitlePlatform } from "@/types/title-optimizer";

export const dynamic = "force-dynamic";

const SYSTEM = `You are an expert Indian marketplace copywriter. Follow the user's response format exactly.
Use plain text only — no markdown code fences.`;

function sseEncode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const sellerId = session.user.id;

  if (await isTitleGenerationRateLimited(sellerId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Title generation limit reached. Try again in an hour.",
        },
      },
      { status: 429 }
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "UNAVAILABLE", message: "Title AI is not configured." } },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = TitleFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.catalogProductId) {
    const ok = await db.product.findFirst({
      where: { id: data.catalogProductId, sellerId },
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
    }
  }

  let competitorData: string | undefined;
  let competitorJson: Prisma.InputJsonValue | undefined;
  if (data.includeCompetitorAnalysis) {
    try {
      const analysis = await scrapeCompetitorTitles(data.productName, data.category);
      competitorJson = analysis as unknown as Prisma.InputJsonValue;
      competitorData = JSON.stringify(analysis, null, 2).slice(0, 12000);
    } catch {
      competitorData = undefined;
    }
  }

  const accept = req.headers.get("accept") ?? "";
  const useStream = accept.includes("text/event-stream");

  if (useStream) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (obj: unknown) => controller.enqueue(sseEncode(obj));
        const acc: GeneratedTitleResult[] = [];
        let insightAttached = false;

        const runPlatform = async (platform: TitlePlatform) => {
          const slice: TitleFormInput = { ...data, platforms: [platform] };
          const prompt = buildTitlePrompt(slice, competitorData);
          const raw = await callGeminiPlainText(SYSTEM, prompt);
          const parsedOut = parseTitleGenerationOutput(raw, [platform]);
          let result = parsedOut[0];
          if (!result) return null;
          if (result.competitorInsights?.length) {
            if (insightAttached) {
              result = { ...result, competitorInsights: undefined };
            } else {
              insightAttached = true;
            }
          }
          return result;
        };

        try {
          for (const platform of data.platforms) {
            push({ type: "platform_start", platform });
            try {
              const result = await runPlatform(platform);
              if (!result) {
                push({ type: "platform_error", platform, message: "Could not parse model output." });
                continue;
              }
              acc.push(result);
              push({ type: "platform_done", platform, result });
            } catch (e) {
              const message = e instanceof Error ? e.message : "Generation failed";
              push({ type: "platform_error", platform, message });
            }
          }

          if (!acc.length) {
            push({ type: "complete", success: false, error: "No platforms produced a result." });
            controller.close();
            return;
          }

          const { optimizationId } = await persistTitleGeneration(sellerId, data, acc, competitorJson);
          push({ type: "complete", success: true, results: acc, optimizationId });
        } catch (e) {
          console.error("[POST /api/titles/generate stream]", e);
          const message = e instanceof Error ? e.message : "Generation failed";
          push({ type: "complete", success: false, error: message });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const userPrompt = buildTitlePrompt(data, competitorData);

  try {
    const raw = await callGeminiPlainText(SYSTEM, userPrompt);
    const results = parseTitleGenerationOutput(raw, data.platforms);
    if (!results.length) {
      return NextResponse.json(
        { success: false, error: { code: "PARSE_ERROR", message: "Could not parse model output." } },
        { status: 502 }
      );
    }

    const { optimizationId } = await persistTitleGeneration(sellerId, data, results, competitorJson);

    return NextResponse.json({
      success: true,
      data: { results, optimizationId },
    });
  } catch (e) {
    console.error("[POST /api/titles/generate]", e);
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json(
      { success: false, error: { code: "GENERATION_FAILED", message: msg } },
      { status: 500 }
    );
  }
}
