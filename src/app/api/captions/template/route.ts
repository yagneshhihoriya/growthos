import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CaptionTemplateBodySchema } from "@/lib/schemas/caption";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const template = await db.captionTemplate.findFirst({
    where: { sellerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: { template } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CaptionTemplateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const existing = await db.captionTemplate.findFirst({
      where: { sellerId: session.user.id },
    });

    const template = existing
      ? await db.captionTemplate.update({
          where: { id: existing.id },
          data: { name: parsed.data.name, settings: parsed.data.settings as object },
        })
      : await db.captionTemplate.create({
          data: {
            sellerId: session.user.id,
            name: parsed.data.name,
            settings: parsed.data.settings as object,
          },
        });

    return NextResponse.json({ success: true, data: { template } });
  } catch (err) {
    console.error("[POST /api/captions/template]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Could not save template" } },
      { status: 500 }
    );
  }
}
