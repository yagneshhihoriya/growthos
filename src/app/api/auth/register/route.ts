import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeEmail, createVerificationToken, sendVerificationEmail } from "@/lib/email";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  shopName: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
    }

    const { name, shopName, city, password } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    const existing = await db.seller.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.seller.create({
      data: {
        email,
        name,
        shopName: shopName || null,
        city,
        passwordHash,
        isEmailVerified: false,
      },
    });

    const token = await createVerificationToken(email);
    await sendVerificationEmail(email, token);

    return NextResponse.json({ ok: true, emailSent: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
