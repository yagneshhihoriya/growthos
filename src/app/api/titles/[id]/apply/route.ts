import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BodySchema = z.object({
  platforms: z.array(z.string()).min(1),
});

/** POST /api/titles/:id/apply — mark optimization as applied to given platforms. */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "platforms array required" }, { status: 400 });
  }

  const existing = await db.titleOptimization.findFirst({
    where: { id, sellerId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.titleOptimization.update({
    where: { id },
    data: {
      isApplied: true,
      appliedAt: new Date(),
      appliedPlatforms: parsed.data.platforms,
    },
  });

  return NextResponse.json({ optimization: updated });
}
