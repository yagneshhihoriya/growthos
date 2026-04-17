import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireS3 } from "@/lib/env";
import { getS3Client } from "@/lib/s3";
import { publicUrlForS3Key } from "@/lib/public-url";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const bodySchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
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
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }

    const s3 = requireS3();
    const client = getS3Client();

    const ext =
      parsed.data.contentType === "image/jpeg"
        ? "jpg"
        : parsed.data.contentType === "image/png"
          ? "png"
          : "webp";
    const safeName = parsed.data.fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const base = safeName.replace(/\.(jpe?g|png|webp)$/i, "");
    const key = `uploads/${session.user.id}/${nanoid()}-${base}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      ContentType: parsed.data.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 15 });
    const publicUrl = publicUrlForS3Key(key);

    return NextResponse.json({ uploadUrl, fileKey: key, publicUrl });
  } catch (err) {
    console.error("[presigned] Upload URL generation failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
