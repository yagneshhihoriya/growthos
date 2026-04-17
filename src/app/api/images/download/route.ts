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
    });

    if (!batch?.zipDownloadUrl) {
      return NextResponse.json({ error: "ZIP not ready" }, { status: 400 });
    }

    if (batch.zipExpiresAt && batch.zipExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "ZIP expired" }, { status: 410 });
    }

    const client = getS3Client();
    const bucket = getS3Bucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: batch.zipDownloadUrl,
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 30 });
    return NextResponse.json({ downloadUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create download URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
