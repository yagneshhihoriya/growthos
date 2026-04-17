import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.verificationToken.create({
    data: {
      email: normalizeEmail(email),
      token,
      type: "email_verify",
      expiresAt,
    },
  });

  return token;
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.verificationToken.create({
    data: {
      email: normalizeEmail(email),
      token,
      type: "password_reset",
      expiresAt,
    },
  });

  return token;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (process.env.RESEND_API_KEY) {
    const { default: axios } = await import("axios");
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: process.env.EMAIL_FROM ?? "GrowthOS <noreply@growthos.in>",
        to: [email],
        subject: "Verify your GrowthOS account",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
            <h2 style="color:#111;margin-bottom:16px">Welcome to GrowthOS</h2>
            <p style="color:#555;line-height:1.6">Click the button below to verify your email address and activate your account.</p>
            <a href="${verifyUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              Verify Email
            </a>
            <p style="margin-top:24px;color:#888;font-size:13px">
              If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="margin-top:8px;color:#888;font-size:12px">
              This link expires in 24 hours.
            </p>
          </div>
        `,
      },
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Email verification link for ${email}: ${verifyUrl}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/login?reset=${encodeURIComponent(token)}`;

  if (process.env.RESEND_API_KEY) {
    const { default: axios } = await import("axios");
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: process.env.EMAIL_FROM ?? "GrowthOS <noreply@growthos.in>",
        to: [email],
        subject: "Reset your GrowthOS password",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
            <h2 style="color:#111;margin-bottom:16px">Password Reset</h2>
            <p style="color:#555;line-height:1.6">Click below to reset your password.</p>
            <a href="${resetUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              Reset Password
            </a>
            <p style="margin-top:24px;color:#888;font-size:13px">This link expires in 1 hour.</p>
          </div>
        `,
      },
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }
}
