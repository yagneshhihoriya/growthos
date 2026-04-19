/**
 * BullMQ worker: processes bulk title CSV jobs enqueued by POST /api/titles/bulk.
 * Run: `npm run worker:bulk-titles` (requires REDIS_URL, DATABASE_URL, GEMINI_API_KEY, AWS S3).
 */
import { Worker } from "bullmq";
import { Prisma } from "@prisma/client";
import { getRedis } from "@/lib/redis";
import { db } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { parseCSVRow, parseCSVHeaders } from "@/lib/csv-parse";
import { generateBulkRowListing } from "@/lib/title-pipeline";

const QUEUE_NAME = "bulk-title";
const BATCH_SIZE = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function escCell(s: string): string {
  return `"${String(s ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

export async function runBulkTitleJob(jobId: string, sellerId: string, csvText: string, language: string): Promise<void> {
  await db.bulkTitleJob.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  const lines = csvText.split(/\n/).filter((l) => l.trim());
  const headers = parseCSVHeaders(lines[0] ?? "");
  const rows = lines.slice(1);

  const outputHeaders = [
    "product_name",
    "category",
    "price",
    "title_amazon",
    "title_flipkart",
    "title_meesho",
    "title_instagram",
    "description",
    "bullet_1",
    "bullet_2",
    "bullet_3",
    "bullet_4",
    "bullet_5",
    "keywords",
    "score",
    "status",
    "error",
  ];
  const outputLines: string[] = [outputHeaders.join(",")];
  const errors: Array<{ row: number; productName: string; error: string }> = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row, bIdx) => {
        const rowNum = i + bIdx + 2;
        let productNameForErr = `Row ${rowNum}`;
        try {
          const parsed = parseCSVRow(row);
          const vals: Record<string, string> = {};
          headers.forEach((h, hi) => {
            vals[h] = parsed[hi] ?? "";
          });

          const productName = vals.product_name?.trim();
          const category = vals.category?.trim();
          const price = parseFloat(vals.price || "0");

          if (!productName || !category) throw new Error("Missing product_name or category");
          if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price — must be a positive number");
          productNameForErr = productName;

          const rowLang = (vals.language || language || "hinglish").trim();
          const result = await generateBulkRowListing({
            productName,
            category,
            price,
            colors: vals.colors?.trim(),
            sizes: vals.sizes?.trim(),
            fabric: vals.fabric?.trim(),
            currentTitle: vals.current_title?.trim(),
            language: rowLang,
          });

          const b = result.bullets;
          outputLines.push(
            [
              escCell(productName),
              escCell(category),
              String(price),
              escCell(result.titles.amazon),
              escCell(result.titles.flipkart),
              escCell(result.titles.meesho),
              escCell(result.titles.instagram),
              escCell(result.description),
              escCell(b[0] ?? ""),
              escCell(b[1] ?? ""),
              escCell(b[2] ?? ""),
              escCell(b[3] ?? ""),
              escCell(b[4] ?? ""),
              escCell(result.keywords.join("; ")),
              String(result.score),
              "success",
              '""',
            ].join(",")
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          errors.push({ row: rowNum, productName: productNameForErr, error: msg });
          const cells = outputHeaders.map((h, ci) => {
            if (ci === 0) return escCell(productNameForErr);
            if (ci === outputHeaders.length - 2) return '"failed"';
            if (ci === outputHeaders.length - 1) return escCell(msg);
            return '""';
          });
          outputLines.push(cells.join(","));
        }
      })
    );

    const processedRows = Math.min(rows.length, i + batch.length);
    await db.bulkTitleJob.update({
      where: { id: jobId },
      data: {
        processedRows,
        failedRows: errors.length,
      },
    });

    if (i + BATCH_SIZE < rows.length) {
      await sleep(1000);
    }
  }

  const outputCsv = outputLines.join("\n");
  const outputKey = `${sellerId}/bulk-titles/${jobId}_output.csv`;
  const outputFileUrl = await uploadToS3({
    key: outputKey,
    buffer: Buffer.from(outputCsv, "utf8"),
    contentType: "text/csv",
    cacheControl: "private, no-store",
  });

  const allFailed = errors.length === rows.length && rows.length > 0;

  await db.bulkTitleJob.update({
    where: { id: jobId },
    data: {
      status: allFailed ? "failed" : "complete",
      processedRows: rows.length,
      failedRows: errors.length,
      outputFileUrl,
      errorSummary: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : undefined,
      completedAt: new Date(),
    },
  });
}

async function main(): Promise<void> {
  const connection = getRedis();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { jobId, sellerId, csvText, language } = job.data as {
        jobId: string;
        sellerId: string;
        csvText: string;
        language: string;
      };
      await runBulkTitleJob(jobId, sellerId, csvText, language);
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker:bulk-titles] job ${job?.id} failed:`, err?.message);
    const jobId = (job?.data as { jobId?: string })?.jobId;
    if (jobId) {
      void db.bulkTitleJob
        .update({
          where: { id: jobId },
          data: {
            status: "failed",
            errorSummary: [{ error: err?.message ?? "Worker failed" }] as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        })
        .catch(console.error);
    }
  });

  console.info("[worker:bulk-titles] Listening on queue:", QUEUE_NAME);
}

void main();
