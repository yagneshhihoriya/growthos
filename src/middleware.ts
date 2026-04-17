import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe auth check — do NOT import `@/lib/auth` here: that file pulls Prisma +
 * bcrypt into the middleware bundle and breaks the Edge runtime / webpack chunks
 * (`e[o] is not a function`, missing vendor-chunks, RSC parse errors).
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const isLoggedIn = Boolean(token);

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/register";
  const isApp =
    path.startsWith("/dashboard") ||
    path.startsWith("/photo-studio") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings") ||
    path.startsWith("/connections") ||
    path.startsWith("/social-posts");
  if (isApp && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|og-image.png).*)"],
};
