import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/titles/:id/versions — version history for the same product (or single row if no product). */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const optimization = await db.titleOptimization.findFirst({
    where: { id, sellerId: session.user.id },
  });
  if (!optimization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!optimization.productId) {
    return NextResponse.json({
      versions: [
        {
          id: optimization.id,
          version: optimization.version,
          optimizedScore: optimization.optimizedScore,
          isApplied: optimization.isApplied,
          createdAt: optimization.createdAt,
          optimizedTitles: optimization.optimizedTitles,
        },
      ],
    });
  }

  const versions = await db.titleOptimization.findMany({
    where: {
      sellerId: session.user.id,
      productId: optimization.productId,
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      optimizedScore: true,
      isApplied: true,
      createdAt: true,
      optimizedTitles: true,
    },
  });

  return NextResponse.json({ versions });
}
