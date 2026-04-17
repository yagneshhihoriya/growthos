import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/social/posts
 *
 * Query params (all optional):
 *   status  — filter by exact status ("draft" | "scheduled" | "pending_insights" | "published" | "failed")
 *   month   — 1..12 (IST month window, paired with year)
 *   year    — YYYY
 *   take    — default 50, max 200
 *
 * Includes the latest analytics row for quick sort in the Published tab.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const monthRaw = searchParams.get("month");
    const yearRaw = searchParams.get("year");
    const takeRaw = Number(searchParams.get("take") ?? 50);
    const take = Math.min(Math.max(Number.isFinite(takeRaw) ? takeRaw : 50, 1), 200);

    const where: Prisma.SocialPostWhereInput = { sellerId: session.user.id };
    if (status) where.status = status;

    if (monthRaw && yearRaw) {
      const month = Number(monthRaw);
      const year = Number(yearRaw);
      if (Number.isFinite(month) && Number.isFinite(year) && month >= 1 && month <= 12) {
        where.scheduledFor = {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        };
      }
    }

    const posts = await db.socialPost.findMany({
      where,
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      take,
      include: {
        analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ posts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load posts";
    console.error("[api/social/posts] GET", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
