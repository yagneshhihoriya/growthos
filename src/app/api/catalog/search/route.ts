import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/catalog/search?q= — search the signed-in seller's active products by name or category. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const id = (searchParams.get("id") ?? "").trim();

  const sellerId = session.user.id;
  const base = { sellerId, isActive: true as const };

  if (id) {
    const one = await db.product.findFirst({
      where: { ...base, id },
      select: { id: true, name: true, category: true, price: true, colors: true },
    });
    return NextResponse.json({
      products: one
        ? [
            {
              ...one,
              price: one.price ? Number(one.price) : null,
            },
          ]
        : [],
    });
  }

  const products = await db.product.findMany({
    where:
      q.length < 1
        ? base
        : {
            ...base,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      colors: true,
    },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : null,
    })),
  });
}
