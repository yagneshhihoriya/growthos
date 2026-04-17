import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/products — list the signed-in seller's active products.
 *  Returns `rawImageUrls` + `processedImages` so the autopilot picker can
 *  show a thumbnail without hitting S3 directly. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await db.product.findMany({
    where: { sellerId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      colors: true,
      sizes: true,
      fabric: true,
      occasion: true,
      rawImageUrls: true,
      processedImages: true,
      stockQuantity: true,
      createdAt: true,
    },
    take: 200,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : null,
    })),
  });
}
