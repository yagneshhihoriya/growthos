import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getS3Bucket, getS3Client } from "@/lib/s3";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = z.string().min(8).safeParse(searchParams.get("batchId"));
    if (!batchId.success) {
      return NextResponse.json({ error: "Invalid batchId" }, { status: 400 });
    }

    const batch = await db.imageBatch.findFirst({
      where: { id: batchId.data, sellerId: session.user.id },
      include: {
        imageJobs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            originalUrl: true,
            errorMsg: true,
            processedUrls: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let zipUrl: string | null = null;
    if (batch.zipDownloadUrl && batch.zipExpiresAt && batch.zipExpiresAt.getTime() > Date.now()) {
      const client = getS3Client();
      const bucket = getS3Bucket();
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: batch.zipDownloadUrl,
      });
      zipUrl = await getSignedUrl(client, command, { expiresIn: 60 * 30 });
    }

    return NextResponse.json({
      batchId: batch.id,
      total: batch.totalImages,
      processed: batch.processedCount,
      failed: batch.failedCount,
      status: batch.status,
      zipUrl,
      zipExpiresAt: batch.zipExpiresAt?.toISOString() ?? null,
      jobs: batch.imageJobs.map((j) => ({
        id: j.id,
        status: j.status,
        originalUrl: j.originalUrl,
        errorMsg: j.errorMsg,
        processedUrls: (j.processedUrls ?? null) as Record<string, string> | null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch batch status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
