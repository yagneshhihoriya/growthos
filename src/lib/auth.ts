import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { cache } from "@/lib/cache";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60;

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);
const metaConfigured =
  Boolean(process.env.META_CLIENT_ID) && Boolean(process.env.META_CLIENT_SECRET);

async function checkLoginRateLimit(email: string): Promise<boolean> {
  try {
    const key = `rate_limit:login:${email}`;
    const count = await cache.incr(key);
    if (count === 1) await cache.expire(key, RATE_LIMIT_WINDOW);
    return count <= RATE_LIMIT_MAX;
  } catch {
    return true;
  }
}

async function clearLoginRateLimit(email: string): Promise<void> {
  try {
    await cache.del(`rate_limit:login:${email}`);
  } catch {
    // non-critical
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  logger: {
    error(error) {
      if (error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(metaConfigured
      ? [
          Facebook({
            clientId: process.env.META_CLIENT_ID!,
            clientSecret: process.env.META_CLIENT_SECRET!,
            authorization: {
              params: { scope: "email,public_profile" },
            },
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (typeof rawEmail !== "string" || typeof password !== "string") return null;

        const email = normalizeEmail(rawEmail);

        const allowed = await checkLoginRateLimit(email);
        if (!allowed) return null;

        const seller = await db.seller.findUnique({ where: { email } });
        if (!seller?.passwordHash) return null;

        const { default: bcrypt } = await import("bcryptjs");
        const passwordMatch = await bcrypt.compare(password, seller.passwordHash);
        if (!passwordMatch) return null;

        await clearLoginRateLimit(email);

        await db.seller.update({
          where: { id: seller.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: seller.id,
          email: seller.email,
          name: seller.name,
          image: seller.avatarUrl,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (user?.id && account?.provider !== "credentials") {
        await db.seller.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {});
      }
    },
    async signOut() {
      // server-side cleanup placeholder
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      if (trigger === "update" && token.sub) {
        const seller = await db.seller.findUnique({
          where: { id: String(token.sub) },
          select: { name: true, email: true, avatarUrl: true, plan: true, shopName: true, isEmailVerified: true },
        });
        if (seller) {
          token.name = seller.name;
          token.email = seller.email;
          token.picture = seller.avatarUrl ?? undefined;
          token.plan = seller.plan;
          token.shopName = seller.shopName;
          token.isEmailVerified = seller.isEmailVerified;
        }
        return token;
      }

      if (user && account) {
        if (account.provider === "credentials") {
          const seller = await db.seller.findUnique({
            where: { id: String(user.id) },
            select: { plan: true, shopName: true, isEmailVerified: true },
          });
          token.sub = user.id;
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
          token.plan = seller?.plan ?? "free";
          token.shopName = seller?.shopName ?? null;
          token.isEmailVerified = seller?.isEmailVerified ?? false;
          return token;
        }

        if (account.provider === "google" || account.provider === "facebook") {
          const email = user.email ? normalizeEmail(user.email) : null;
          if (!email) return token;

          const googleId =
            account.provider === "google"
              ? String(
                  (profile as { sub?: string } | null | undefined)?.sub ??
                    account.providerAccountId
                )
              : undefined;
          const metaId =
            account.provider === "facebook"
              ? String(
                  (profile as { id?: string } | null | undefined)?.id ??
                    account.providerAccountId
                )
              : undefined;

          const seller = await db.seller.upsert({
            where: { email },
            create: {
              email,
              name: user.name ?? "Seller",
              avatarUrl: user.image ?? null,
              googleId: googleId ?? null,
              metaId: metaId ?? null,
              isEmailVerified: true,
              lastLoginAt: new Date(),
            },
            update: {
              name: user.name ?? undefined,
              avatarUrl: user.image ?? undefined,
              lastLoginAt: new Date(),
              googleId: googleId ?? undefined,
              metaId: metaId ?? undefined,
            },
          });

          token.sub = seller.id;
          token.name = seller.name;
          token.email = seller.email;
          token.picture = seller.avatarUrl;
          token.plan = seller.plan;
          token.shopName = seller.shopName;
          token.isEmailVerified = seller.isEmailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        if (token.email) session.user.email = String(token.email);
        if (token.name) session.user.name = String(token.name);
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;
        session.user.plan = (token.plan as string) ?? "free";
        session.user.shopName = (token.shopName as string | null) ?? null;
        session.user.isEmailVerified = (token.isEmailVerified as boolean) ?? false;
      }
      return session;
    },
  },
});
