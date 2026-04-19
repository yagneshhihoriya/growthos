import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const LIMIT = 20;

/** GET /api/titles — list optimizations for current seller (optional productId, page). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const where = {
    sellerId: session.user.id,
    ...(productId ? { productId } : {}),
  };

  const [optimizations, total] = await Promise.all([
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
    optimizations,
    total,
    page,
    pages: Math.ceil(total / LIMIT) || 1,
  });
}
