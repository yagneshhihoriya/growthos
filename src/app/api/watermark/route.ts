import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  textContent: z.string().max(80).nullable().optional(),
  fontFamily: z.string().max(40).optional(),
  textColor: z.string().max(20).optional(),
  position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "bottom-center", "center", "diagonal"]),
  opacity: z.number().min(0.05).max(0.5),
  scale: z.number().min(0.05).max(0.3).optional(),
  padding: z.number().int().min(0).max(200).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preset = await db.watermarkPreset.findFirst({
      where: { sellerId: session.user.id, isDefault: true },
    });

    return NextResponse.json({ preset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load watermark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid watermark settings" }, { status: 400 });
    }

    await db.watermarkPreset.updateMany({
      where: { sellerId: session.user.id },
      data: { isDefault: false },
    });

    const preset = await db.watermarkPreset.create({
      data: {
        sellerId: session.user.id,
        logoUrl: parsed.data.logoUrl ?? null,
        textContent: parsed.data.textContent ?? null,
        fontFamily: parsed.data.fontFamily ?? "Inter",
        textColor: parsed.data.textColor ?? "#ffffff",
        position: parsed.data.position,
        opacity: parsed.data.opacity,
        scale: parsed.data.scale ?? 0.15,
        padding: parsed.data.padding ?? 20,
        isDefault: true,
      },
    });

    return NextResponse.json({ preset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save watermark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
