import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type {
  LibraryBatchItem,
  LibraryBatchStyleEntry,
  LibraryItem,
  LibrarySingleItem,
} from "@/types/library";

/**
 * GET /api/images/library
 *
 * Two response shapes, selected by query params for back-compat:
 *
 * 1) Grouped (default, used by Photo Studio Library grid)
 *    → { items: LibraryItem[] }       // multi-image batches collapse into one item
 *
 * 2) Flat legacy (used by ImagePickerTabs — needs every image as a pickable thumb)
 *    Triggered when ANY of `cursor`, `productId`, or `take` query params is present.
 *    → { jobs: LibraryJob[], nextCursor: string | null }
 *
 * Grouped mode is capped at MAX_JOBS to avoid unbounded queries; pagination can
 * be added later if sellers cross that ceiling.
 */
const MAX_JOBS = 1000;
const DEFAULT_FLAT_TAKE = 20;
const MAX_FLAT_TAKE = 100;

function asStringRecord(json: unknown): Record<string, string> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

function extractStyleKey(options: unknown): string | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const style = (options as Record<string, unknown>).style;
  return typeof style === "string" ? style : null;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const productId = url.searchParams.get("productId");
    const takeRaw = url.searchParams.get("take");
    const legacyMode = cursor !== null || productId !== null || takeRaw !== null;

    if (legacyMode) {
      const take = Math.min(
        MAX_FLAT_TAKE,
        Math.max(1, Number.parseInt(takeRaw ?? String(DEFAULT_FLAT_TAKE), 10) || DEFAULT_FLAT_TAKE)
      );
      const jobs = await db.imageJob.findMany({
        where: {
          sellerId: session.user.id,
          status: "done",
          ...(productId ? { productId } : {}),
        },
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          productId: true,
          originalUrl: true,
          processedUrls: true,
          createdAt: true,
          completedAt: true,
          product: { select: { id: true, name: true } },
        },
      });
      const hasMore = jobs.length > take;
      const page = hasMore ? jobs.slice(0, take) : jobs;
      return NextResponse.json({
        jobs: page.map((j) => ({
          id: j.id,
          productId: j.productId,
          originalUrl: j.originalUrl,
          processedUrls: asStringRecord(j.processedUrls),
          createdAt: j.createdAt.toISOString(),
          completedAt: j.completedAt?.toISOString() ?? null,
          product: j.product ?? null,
        })),
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      });
    }

    const jobs = await db.imageJob.findMany({
      where: {
        sellerId: session.user.id,
        status: "done",
      },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: MAX_JOBS,
      select: {
        id: true,
        batchId: true,
        productId: true,
        originalUrl: true,
        processedUrls: true,
        options: true,
        createdAt: true,
        completedAt: true,
        product: { select: { id: true, name: true } },
      },
    });

    const singles: LibrarySingleItem[] = [];
    const batchBuckets = new Map<
      string,
      {
        batchId: string;
        createdAt: Date;
        completedAt: Date | null;
        originalUrl: string;
        product: { id: string; name: string } | null;
        styles: LibraryBatchStyleEntry[];
      }
    >();

    for (const job of jobs) {
      const processedUrls = asStringRecord(job.processedUrls);
      if (!job.batchId) {
        singles.push({
          kind: "single",
          job: {
            id: job.id,
            productId: job.productId,
            originalUrl: job.originalUrl,
            processedUrls,
            createdAt: job.createdAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? null,
            product: job.product ?? null,
          },
        });
        continue;
      }

      const generated = processedUrls?.generated ?? null;
      const styleEntry: LibraryBatchStyleEntry = {
        jobId: job.id,
        style: extractStyleKey(job.options),
        imageUrl: generated,
      };

      const bucket = batchBuckets.get(job.batchId);
      if (!bucket) {
        batchBuckets.set(job.batchId, {
          batchId: job.batchId,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          originalUrl: job.originalUrl,
          product: job.product ?? null,
          styles: [styleEntry],
        });
      } else {
        bucket.styles.push(styleEntry);
        if (job.completedAt && (!bucket.completedAt || job.completedAt > bucket.completedAt)) {
          bucket.completedAt = job.completedAt;
        }
        if (job.createdAt < bucket.createdAt) bucket.createdAt = job.createdAt;
      }
    }

    const batches: LibraryBatchItem[] = Array.from(batchBuckets.values()).map((b) => ({
      kind: "batch",
      batchId: b.batchId,
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
      totalImages: b.styles.length,
      doneImages: b.styles.filter((s) => !!s.imageUrl).length,
      originalUrl: b.originalUrl,
      styles: b.styles,
      product: b.product,
    }));

    const items: LibraryItem[] = [...singles, ...batches].sort((a, b) => {
      const aTime =
        a.kind === "single"
          ? new Date(a.job.completedAt ?? a.job.createdAt).getTime()
          : new Date(a.completedAt ?? a.createdAt).getTime();
      const bTime =
        b.kind === "single"
          ? new Date(b.job.completedAt ?? b.job.createdAt).getTime()
          : new Date(b.completedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load library";
    console.error("[api/images/library]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
