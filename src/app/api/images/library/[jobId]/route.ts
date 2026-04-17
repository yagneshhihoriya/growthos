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
  context: { params: { jobId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = context.params;
    if (!jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    const job = await db.imageJob.findFirst({
      where: { id: jobId, sellerId: session.user.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const processedUrls = asStringRecord(job.processedUrls);
    const keys = collectS3KeysForImageJob({
      sellerId: session.user.id,
      originalUrl: job.originalUrl,
      originalKey: job.originalKey,
      processedUrls,
      bgRemovedUrl: job.bgRemovedUrl,
    });

    for (const key of keys) {
      try {
        await deleteFromS3(key);
      } catch (err) {
        console.error("[library delete] S3 delete failed", key, err);
        return NextResponse.json(
          { error: "Could not remove one or more files from storage" },
          { status: 502 }
        );
      }
    }

    await db.imageJob.delete({ where: { id: job.id } });

    return NextResponse.json({ ok: true, deletedKeys: keys.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("[library delete]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
