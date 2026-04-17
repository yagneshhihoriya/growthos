import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await db.imageJob.findMany({
      where: { sellerId: session.user.id, status: "done" },
      orderBy: { completedAt: "desc" },
      take: 200,
      select: {
        id: true,
        originalUrl: true,
        processedUrls: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
