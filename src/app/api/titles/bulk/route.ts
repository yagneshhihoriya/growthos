import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { parseCSVHeaders } from "@/lib/csv-parse";
import { getBulkTitleQueue } from "@/lib/queue";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const language = (formData.get("language") as string) || "hinglish";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "File must be .csv" }, { status: 400 });
    }
    if (file.size > 512_000) {
      return NextResponse.json({ error: "File too large. Max 500KB (~200 products)" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row + at least 1 product" }, { status: 400 });
    }
    if (lines.length > 201) {
      return NextResponse.json({ error: "Maximum 200 products per batch" }, { status: 400 });
    }

    const headers = parseCSVHeaders(lines[0] ?? "");
    const required = ["product_name", "category", "price"];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `CSV missing required columns: ${missing.join(", ")}`,
          hint: "Required: product_name, category, price | Optional: colors, sizes, fabric, current_title, language",
        },
        { status: 400 }
      );
    }

    const inputKey = `${session.user.id}/bulk-titles/${Date.now()}_input.csv`;
    const inputFileUrl = await uploadToS3({
      key: inputKey,
      buffer: Buffer.from(text, "utf8"),
      contentType: "text/csv",
      cacheControl: "private, no-store",
    });

    const job = await db.bulkTitleJob.create({
      data: {
        sellerId: session.user.id,
        status: "pending",
        totalRows: lines.length - 1,
        inputFileUrl,
        language,
      },
    });

    try {
      const queue = getBulkTitleQueue();
      await queue.add(
        "process-bulk-titles",
        {
          jobId: job.id,
          sellerId: session.user.id,
          csvText: text,
          language,
        },
        {
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
        }
      );
    } catch (err) {
      console.error("[api/titles/bulk] queue", err);
      await db.bulkTitleJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorSummary: [{ error: "Could not enqueue job — is REDIS_URL set? Run npm run worker:bulk-titles." }],
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        { error: "Bulk queue unavailable. Configure REDIS_URL and start the bulk title worker." },
        { status: 503 }
      );
    }

    return NextResponse.json({ jobId: job.id, totalRows: lines.length - 1 });
  } catch (e) {
    console.error("[api/titles/bulk POST]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await db.bulkTitleJob.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ jobs });
}
