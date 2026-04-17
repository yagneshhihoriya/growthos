import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const record = await db.verificationToken.findUnique({ where: { token } });

  if (!record) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  if (record.usedAt) {
    return NextResponse.redirect(new URL("/login?error=token_used", request.url));
  }

  if (new Date() > record.expiresAt) {
    return NextResponse.redirect(new URL("/login?error=token_expired", request.url));
  }

  if (record.type !== "email_verify") {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  await db.$transaction([
    db.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    db.seller.updateMany({
      where: { email: record.email },
      data: { isEmailVerified: true },
    }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
