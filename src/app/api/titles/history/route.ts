import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const LIMIT = 20;

/** GET /api/titles/history — same rows as GET /api/titles with `{ success, data }` envelope. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const where = { sellerId: session.user.id };

  const [items, total] = await Promise.all([
    db.titleOptimization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      include: {
        product: { select: { name: true, rawImageUrls: true } },
      },
    }),
    db.titleOptimization.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      pages: Math.ceil(total / LIMIT) || 1,
    },
  });
}
