import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatGeminiApiError,
  nanoBananaEditImage,
  uploadToS3,
} from "@/lib/image-pipeline";
import {
  extractS3ObjectKeyFromUrl,
  isSellerObjectKey,
  loadImageBufferForEdit,
} from "@/lib/s3-object-access";
import { buildImageEditPrompt } from "@/lib/photo-prompts";
import {
  PRODUCT_CATEGORY_VALUES,
  type ImageStyle,
  type ProductAnalysis,
  type ProductCategory,
} from "@/types/photo-studio";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  imageUrl: z.string().url(),
  category: z.enum(
    PRODUCT_CATEGORY_VALUES as readonly [ProductCategory, ...ProductCategory[]]
  ),
  styles: z
    .array(
      z.enum([
        "white_bg",
        "lifestyle_wood",
        "lifestyle_marble",
        "lifestyle_outdoor",
        "festive_diwali",
        "festive_wedding",
        "close_up",
        "close_up_front",
        "infographic",
      ])
    )
    .min(1)
    .max(5),
  customInstructions: z.string().max(500).optional(),
  productId: z.string().min(1).optional(),
  // Vision analysis is fully optional — we shape-check only enough to
  // guarantee a safe pass-through to buildImageEditPrompt. A missing or
  // malformed analysis is treated as null and generation proceeds.
  analysis: z
    .object({
      productType: z.string(),
      category: z.enum(
        PRODUCT_CATEGORY_VALUES as readonly [ProductCategory, ...ProductCategory[]]
      ),
      priceSegment: z.enum(["budget", "mid", "premium", "luxury"]),
      primaryColor: z.string(),
      keyFeatures: z.array(z.string()),
      targetGender: z.enum(["men", "women", "unisex", "kids"]),
      photographyNotes: z.object({
        idealAngle: z.string(),
        lightingStyle: z.string(),
        backgroundRecommendation: z.string(),
        commonMistakes: z.string(),
        amazonTopSellersUse: z.string(),
      }),
      styleRecommendations: z.record(z.string()).optional().default({}),
      doNotInclude: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    })
    .nullish(),
});

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
  const { imageUrl, category, styles, customInstructions, productId } = parsed.data;
  const analysis = (parsed.data.analysis ?? null) as ProductAnalysis | null;

  // Resolve productId if it belongs to seller; silently drop otherwise.
  let resolvedProductId: string | null = null;
  if (productId) {
    const prod = await db.product.findFirst({
      where: { id: productId, sellerId },
      select: { id: true },
    });
    if (prod) resolvedProductId = prod.id;
  }

  // Preserve original URL as a viewer-path URL where possible (auth-gated).
  const originalUrlForJob = (() => {
    const k = extractS3ObjectKeyFromUrl(imageUrl);
    if (k && isSellerObjectKey(k, sellerId)) {
      return `/api/images/file?key=${encodeURIComponent(k)}`;
    }
    return imageUrl;
  })();

  // Create batch + one pending job per style up-front so the library has trace.
  const batch = await db.imageBatch.create({
    data: {
      sellerId,
      totalImages: styles.length,
      status: "running",
      options: {
        kind: "studio-multi",
        category,
        customInstructions: customInstructions ?? null,
        styles,
      } as unknown as Prisma.JsonObject,
    },
  });

  // Create all jobs first so we can reference their ids during generation.
  const createdJobs = await Promise.all(
    styles.map((style, idx) =>
      db.imageJob.create({
        data: {
          sellerId,
          batchId: batch.id,
          productId: resolvedProductId,
          jobIndex: idx,
          originalUrl: originalUrlForJob,
          status: "pending",
          options: {
            mode: "multi",
            style,
            category,
            customInstructions: customInstructions ?? null,
          } as unknown as Prisma.JsonObject,
        },
        select: { id: true },
      })
    )
  );
  const jobIdByStyle = new Map<ImageStyle, string>(
    styles.map((s, i) => [s, createdJobs[i].id])
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "start", total: styles.length, batchId: batch.id });

      // Load the source buffer once; reuse across styles.
      let sourceBuffer: Buffer;
      try {
        sourceBuffer = await loadImageBufferForEdit(imageUrl, sellerId);
      } catch (err) {
        const message = formatGeminiApiError(err) || "Failed to load source image";
        send({ type: "fatal", error: message });
        await db.imageBatch.update({
          where: { id: batch.id },
          data: { status: "failed", completedAt: new Date() },
        });
        await db.imageJob.updateMany({
          where: { batchId: batch.id, status: "pending" },
          data: { status: "failed", errorMsg: message, completedAt: new Date() },
        });
        send({ type: "done" });
        controller.close();
        return;
      }

      let processed = 0;
      let failed = 0;

      // Sequential — Gemini image API has strict per-minute limits.
      for (const style of styles) {
        const jobId = jobIdByStyle.get(style as ImageStyle)!;
        const startedAt = new Date();
        send({ type: "style_start", style });

        await db.imageJob.update({
          where: { id: jobId },
          data: { status: "processing", startedAt },
        });

        try {
          const prompt = buildImageEditPrompt(
            style as ImageStyle,
            category as ProductCategory,
            customInstructions,
            analysis
          );

          const jpeg = await nanoBananaEditImage(sourceBuffer, prompt);
          const key = `${sellerId}/studio/${jobId}-${nanoid(6)}.jpg`;
          await uploadToS3(jpeg, key, "image/jpeg");
          const generatedUrl = `/api/images/file?key=${encodeURIComponent(key)}`;

          await db.imageJob.update({
            where: { id: jobId },
            data: {
              processedUrls: { generated: generatedUrl } as unknown as Prisma.JsonObject,
              status: "done",
              completedAt: new Date(),
              apiUsed: "gemini-image",
              processingMs: Date.now() - startedAt.getTime(),
            },
          });
          processed += 1;

          send({ type: "style_done", style, imageUrl: generatedUrl, jobId });

          // Keep the batch row's processed count fresh.
          await db.imageBatch.update({
            where: { id: batch.id },
            data: { processedCount: processed, failedCount: failed },
          });
        } catch (err) {
          const message = formatGeminiApiError(err) || "Generation failed";
          console.error(`[api/images/generate-multiple] style=${style}`, message);
          failed += 1;
          await db.imageJob.update({
            where: { id: jobId },
            data: {
              status: "failed",
              errorMsg: message,
              completedAt: new Date(),
              processingMs: Date.now() - startedAt.getTime(),
            },
          });
          send({ type: "style_error", style, error: message });
        }
      }

      await db.imageBatch.update({
        where: { id: batch.id },
        data: {
          processedCount: processed,
          failedCount: failed,
          status: failed === styles.length ? "failed" : "done",
          completedAt: new Date(),
        },
      });

      send({ type: "done", processed, failed, batchId: batch.id });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
