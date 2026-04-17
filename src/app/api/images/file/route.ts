import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { downloadFromS3, getPresignedDownloadUrl } from "@/lib/s3";
import { isSellerObjectKey } from "@/lib/s3-object-access";

/**
 * Authenticated access to private S3 objects for the current seller.
 * - Default: 307 redirect to a short-lived presigned GET URL (good for <img src>).
 * - ?download=1: stream the file with Content-Disposition attachment (good for Save as).
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get("key");
    if (!rawKey || rawKey.includes("..")) {
      return NextResponse.json({ error: "Missing or invalid key" }, { status: 400 });
    }

    const key = decodeURIComponent(rawKey);
    if (!isSellerObjectKey(key, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wantDownload = searchParams.get("download") === "1";

    if (wantDownload) {
      const buf = await downloadFromS3(key);
      const ext = key.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="growthos-${Date.now()}.${ext}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const signed = await getPresignedDownloadUrl({ key, expiresInSeconds: 3600 });
    return NextResponse.redirect(signed, 307);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load file";
    console.error("[api/images/file]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
