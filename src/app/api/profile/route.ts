import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(2).max(120),
  shopName: z.string().max(120).optional().nullable(),
  city: z.string().min(2).max(80),
  avatarUrl: z.string().url().max(2000).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().max(128).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }

    const { name, shopName, city, avatarUrl, currentPassword, newPassword } = parsed.data;
    const trimmedNew = (newPassword ?? "").trim();
    if (trimmedNew && trimmedNew.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const seller = await db.seller.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!seller) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    let passwordHash: string | undefined;
    if (trimmedNew) {
      if (seller.passwordHash) {
        if (!currentPassword || typeof currentPassword !== "string") {
          return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
        }
        const ok = await bcrypt.compare(currentPassword, seller.passwordHash);
        if (!ok) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
        passwordHash = await bcrypt.hash(trimmedNew, 12);
      } else {
        passwordHash = await bcrypt.hash(trimmedNew, 12);
      }
    }

    await db.seller.update({
      where: { id: seller.id },
      data: {
        name,
        shopName: shopName === "" || shopName === null || shopName === undefined ? null : shopName,
        city,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
