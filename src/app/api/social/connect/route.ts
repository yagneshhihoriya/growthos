import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import axios from "axios";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";

const META_APP_ID = () => process.env.META_CLIENT_ID ?? "";
const META_APP_SECRET = () => process.env.META_CLIENT_SECRET ?? "";
const BASE_URL = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await request.json()) as { platform?: string };
  if (!json.platform) {
    return NextResponse.json({ error: "Missing platform" }, { status: 400 });
  }

  await db.socialConnection.deleteMany({
    where: { sellerId: session.user.id, platform: json.platform },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Facebook Login for Business / Instagram Graph API scopes.
 * `instagram_basic` and legacy names were deprecated (2025); use `instagram_business_*`.
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/
 */
const SCOPES = [
  "instagram_business_basic",
  "instagram_content_publish",
  "instagram_business_manage_comments",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
].join(",");

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Meta redirects here on failure (?error=... or ?error_message=...&error_code=...) — not a JSON API call.
  const oauthError =
    searchParams.get("error") ??
    searchParams.get("error_message") ??
    searchParams.get("error_description");
  if (oauthError || searchParams.get("error_code")) {
    const detail =
      searchParams.get("error_description") ??
      searchParams.get("error_message") ??
      oauthError ??
      "Facebook login was denied or failed.";
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(detail)}`, request.url)
    );
  }

  if (code && state) {
    return handleCallback(request, session.user.id, code, state);
  }

  if (platform === "instagram" || platform === "facebook") {
    return initiateConnect(session.user.id, platform);
  }

  return NextResponse.json({ error: "Missing platform parameter" }, { status: 400 });
}

async function initiateConnect(sellerId: string, platform: string) {
  const csrfState = nanoid(32);
  await cache.set(`csrf:social:${csrfState}`, { sellerId, platform }, 600);

  const redirectUri = `${BASE_URL()}/api/social/connect`;
  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", csrfState);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.json({ authUrl: authUrl.toString() });
}

async function handleCallback(request: Request, sellerId: string, code: string, state: string) {
  const stored = await cache.getAndDel<{ sellerId: string; platform: string }>(`csrf:social:${state}`);
  if (!stored || stored.sellerId !== sellerId) {
    return NextResponse.redirect(new URL("/dashboard?error=csrf_mismatch", request.url));
  }

  try {
    const redirectUri = `${BASE_URL()}/api/social/connect`;

    const tokenRes = await axios.get<{
      access_token: string;
      token_type: string;
      expires_in?: number;
    }>("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        client_id: META_APP_ID(),
        client_secret: META_APP_SECRET(),
        redirect_uri: redirectUri,
        code,
      },
    });
    const shortToken = tokenRes.data.access_token;

    const longRes = await axios.get<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID(),
        client_secret: META_APP_SECRET(),
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;
    const expiresIn = longRes.data.expires_in;

    const meRes = await axios.get<{ id: string; name: string }>(
      "https://graph.facebook.com/v19.0/me",
      { params: { access_token: longToken, fields: "id,name" } }
    );
    const platformUserId = meRes.data.id;

    let pageId: string | null = null;
    let instagramAccountId: string | null = null;
    let instagramUsername: string | null = null;

    try {
      const pagesRes = await axios.get<{
        data: Array<{ id: string; name: string; access_token: string }>;
      }>("https://graph.facebook.com/v19.0/me/accounts", {
        params: { access_token: longToken },
      });

      for (const page of pagesRes.data.data) {
        pageId = page.id;
        try {
          const igRes = await axios.get<{
            instagram_business_account?: { id: string };
          }>(`https://graph.facebook.com/v19.0/${page.id}`, {
            params: {
              access_token: longToken,
              fields: "instagram_business_account",
            },
          });
          if (igRes.data.instagram_business_account?.id) {
            instagramAccountId = igRes.data.instagram_business_account.id;
            break;
          }
        } catch {
          // page may not have IG linked
        }
      }
    } catch {
      // pages access may fail
    }

    if (instagramAccountId && stored.platform === "instagram") {
      try {
        const unameRes = await axios.get<{ username?: string }>(
          `https://graph.facebook.com/v19.0/${instagramAccountId}`,
          { params: { fields: "username", access_token: longToken } }
        );
        instagramUsername = unameRes.data.username ?? null;
      } catch {
        // username optional
      }
    }

    const { ciphertext, iv, tag } = encrypt(longToken);

    const scopeSchema = z.array(z.string());
    const scopesGranted = scopeSchema.safeParse(SCOPES.split(",")).data ?? [];

    await db.socialConnection.upsert({
      where: { sellerId_platform: { sellerId, platform: stored.platform } },
      create: {
        sellerId,
        platform: stored.platform,
        platformUserId,
        instagramUsername,
        pageId,
        instagramAccountId,
        accessTokenEnc: ciphertext,
        tokenIv: iv,
        tokenTag: tag,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopesGranted,
        isActive: true,
      },
      update: {
        platformUserId,
        instagramUsername,
        pageId,
        instagramAccountId,
        accessTokenEnc: ciphertext,
        tokenIv: iv,
        tokenTag: tag,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopesGranted,
        isActive: true,
        lastRefreshedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL(`/profile?connected=${stored.platform}`, request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
