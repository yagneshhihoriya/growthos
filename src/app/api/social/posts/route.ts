import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await db.socialPost.findMany({
      where: { sellerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        platforms: true,
        scheduledFor: true,
        publishedAt: true,
        igPostUrl: true,
        fbPostUrl: true,
        errorMsg: true,
        createdAt: true,
        caption: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({ posts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load posts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
