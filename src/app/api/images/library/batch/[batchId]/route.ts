import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromS3 } from "@/lib/s3";
import { collectS3KeysForImageJob } from "@/lib/s3-object-access";

function asStringRecord(json: unknown): Record<string, string> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export async function DELETE(
  _req: Request,
  context: { params: { batchId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = context.params;
    if (!batchId) {
      return NextResponse.json({ error: "Missing batch id" }, { status: 400 });
    }

    const batch = await db.imageBatch.findFirst({
      where: { id: batchId, sellerId: session.user.id },
      include: { imageJobs: true },
    });
    if (!batch) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Gather every S3 key across every child job (dedupes original uploads).
    const allKeys = new Set<string>();
    for (const job of batch.imageJobs) {
      const processedUrls = asStringRecord(job.processedUrls);
      const keys = collectS3KeysForImageJob({
        sellerId: session.user.id,
        originalUrl: job.originalUrl,
        originalKey: job.originalKey,
        processedUrls,
        bgRemovedUrl: job.bgRemovedUrl,
      });
      for (const k of keys) allKeys.add(k);
    }

    const keyList = Array.from(allKeys);
    for (const key of keyList) {
      try {
        await deleteFromS3(key);
      } catch (err) {
        console.error("[library batch delete] S3 delete failed", key, err);
        return NextResponse.json(
          { error: "Could not remove one or more files from storage" },
          { status: 502 }
        );
      }
    }

    // Children first (FK constraints), then the batch row.
    await db.imageJob.deleteMany({ where: { batchId: batch.id } });
    await db.imageBatch.delete({ where: { id: batch.id } });

    return NextResponse.json({
      ok: true,
      deletedJobs: batch.imageJobs.length,
      deletedKeys: allKeys.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("[library batch delete]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
