import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET /api/social/posts/:id/analytics — full history for the chart. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await db.socialPost.findFirst({
    where: { id: params.id, sellerId: session.user.id },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const analytics = await db.postAnalytic.findMany({
    where: { postId: params.id },
    orderBy: { fetchedAt: "asc" },
  });

  return NextResponse.json({ analytics });
}
