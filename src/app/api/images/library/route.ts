import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_TAKE = 200;
const MAX_TAKE = 200;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get("productId")?.trim() || undefined;
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
    const takeRaw = Number.parseInt(url.searchParams.get("take") ?? "", 10);
    const take = Math.min(
      MAX_TAKE,
      Number.isFinite(takeRaw) && takeRaw > 0 ? takeRaw : DEFAULT_TAKE
    );

    const jobs = await db.imageJob.findMany({
      where: {
        sellerId: session.user.id,
        status: "done",
        ...(productId ? { productId } : {}),
      },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: take + 1, // fetch one extra to know if there's a next page
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
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return NextResponse.json({ jobs: page, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
