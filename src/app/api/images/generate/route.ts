import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatGeminiApiError,
  nanoBananaCreateImage,
  nanoBananaEditImage,
  STUDIO_CREATE_ORIGINAL_PLACEHOLDER,
  uploadToS3,
} from "@/lib/image-pipeline";
import {
  extractS3ObjectKeyFromUrl,
  isSellerObjectKey,
  loadImageBufferForEdit,
} from "@/lib/s3-object-access";

const bodySchema = z
  .object({
    mode: z.enum(["edit", "create"]),
    prompt: z.string().min(1).max(5000),
    imageUrl: z.string().url().optional(),
    productId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "edit" && !data.imageUrl) {
      ctx.addIssue({ code: "custom", message: "imageUrl is required for edit mode", path: ["imageUrl"] });
    }
  });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.imageUrl?.[0] ?? "Invalid request body";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { mode, prompt, imageUrl, productId } = parsed.data;
    const sellerId = session.user.id;

    // If productId is provided, verify it belongs to this seller before associating.
    // Silently drop on mismatch rather than 403 — the image still generates fine.
    let resolvedProductId: string | null = null;
    if (productId) {
      const prod = await db.product.findFirst({
        where: { id: productId, sellerId },
        select: { id: true },
      });
      if (prod) resolvedProductId = prod.id;
    }

    const originalUrlForJob =
      mode === "edit"
        ? (() => {
            const k = extractS3ObjectKeyFromUrl(imageUrl!);
            if (k && isSellerObjectKey(k, sellerId)) {
              return `/api/images/file?key=${encodeURIComponent(k)}`;
            }
            return imageUrl!;
          })()
        : STUDIO_CREATE_ORIGINAL_PLACEHOLDER;

    const job = await db.imageJob.create({
      data: {
        sellerId,
        batchId: null,
        productId: resolvedProductId,
        originalUrl: originalUrlForJob,
        status: "processing",
        options: { mode, prompt } as unknown as Prisma.JsonObject,
        startedAt: new Date(),
      },
    });

    try {
      let jpeg: Buffer;
      if (mode === "edit") {
        const source = await loadImageBufferForEdit(imageUrl!, sellerId);
        jpeg = await nanoBananaEditImage(source, prompt);
      } else {
        jpeg = await nanoBananaCreateImage(prompt);
      }

      const key = `${sellerId}/studio/${job.id}-${nanoid(6)}.jpg`;
      await uploadToS3(jpeg, key, "image/jpeg");
      const generatedUrl = `/api/images/file?key=${encodeURIComponent(key)}`;

      await db.imageJob.update({
        where: { id: job.id },
        data: {
          processedUrls: { generated: generatedUrl } as unknown as Prisma.JsonObject,
          status: "done",
          completedAt: new Date(),
          apiUsed: "gemini-image",
        },
      });

      return NextResponse.json({ generatedUrl, originalUrl: originalUrlForJob, jobId: job.id });
    } catch (err) {
      const message = formatGeminiApiError(err) || "Generation failed";
      console.error("[api/images/generate]", message, err);
      await db.imageJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMsg: message,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = formatGeminiApiError(err) || "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
