import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await db.socialConnection.findMany({
      where: { sellerId: session.user.id },
      select: {
        platform: true,
        platformUserId: true,
        instagramUsername: true,
        instagramAccountId: true,
        isActive: true,
        connectedAt: true,
        tokenExpiresAt: true,
      },
    });

    return NextResponse.json({ connections });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load connections";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
