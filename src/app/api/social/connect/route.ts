import { NextResponse } from "next/server";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import axios from "axios";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";

const META_APP_ID = () => process.env.META_CLIENT_ID ?? "";
const META_APP_SECRET = () => process.env.META_CLIENT_SECRET ?? "";
const BASE_URL = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Signed OAuth `state` = `platform.sellerId.nonce.expiresAtMs.hmac`.
 * Uses NEXTAUTH_SECRET (already required by the app) — no Redis needed,
 * so the flow works on Vercel without provisioning extra infra.
 */
const STATE_TTL_MS = 10 * 60 * 1000;

function stateSigningSecret(): string {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required to sign OAuth state");
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function signState(payload: string): string {
  return createHmac("sha256", stateSigningSecret()).update(payload).digest("base64url");
}

function buildState(sellerId: string, platform: "instagram" | "facebook"): string {
  const nonce = b64url(randomBytes(16));
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${platform}.${b64url(sellerId)}.${nonce}.${expiresAt}`;
  const sig = signState(payload);
  return `${payload}.${sig}`;
}

function parseState(
  state: string
): { platform: "instagram" | "facebook"; sellerId: string } | null {
  const parts = state.split(".");
  if (parts.length !== 5) return null;
  const [platform, sellerIdB64, nonce, expiresAtStr, sig] = parts;
  if (platform !== "instagram" && platform !== "facebook") return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const payload = `${platform}.${sellerIdB64}.${nonce}.${expiresAtStr}`;
  const expected = signState(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const sellerId = Buffer.from(sellerIdB64, "base64url").toString("utf8");
    return { platform, sellerId };
  } catch {
    return null;
  }
}

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
 * Facebook Login scopes for Instagram Graph API (Instagram Business account
 * linked to a Facebook Page). The `instagram_business_*` aliases Meta shows in
 * some dashboards are not accepted by the OAuth endpoint — use the canonical
 * names below.
 * @see https://developers.facebook.com/docs/permissions/
 */
const SCOPES = [
  "public_profile",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
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

async function initiateConnect(sellerId: string, platform: "instagram" | "facebook") {
  const signedState = buildState(sellerId, platform);

  const redirectUri = `${BASE_URL()}/api/social/connect`;
  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", signedState);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.json({ authUrl: authUrl.toString() });
}

async function handleCallback(request: Request, sellerId: string, code: string, state: string) {
  const parsed = parseState(state);
  if (!parsed || parsed.sellerId !== sellerId) {
    return NextResponse.redirect(new URL("/dashboard?error=csrf_mismatch", request.url));
  }
  const stored = { sellerId: parsed.sellerId, platform: parsed.platform };

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

    if (instagramAccountId) {
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
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // The same Meta access token powers both Instagram Graph API (via the
    // linked IG Business account) and Facebook Pages. One OAuth click should
    // wire up both rows so the user doesn't have to authorize twice.
    const platformsSet = new Set<"instagram" | "facebook">([stored.platform]);
    if (instagramAccountId) platformsSet.add("instagram");
    if (pageId) platformsSet.add("facebook");
    const platformsToWire: Array<"instagram" | "facebook"> = Array.from(platformsSet);

    for (const platform of platformsToWire) {
      await db.socialConnection.upsert({
        where: { sellerId_platform: { sellerId, platform } },
        create: {
          sellerId,
          platform,
          platformUserId,
          instagramUsername: platform === "instagram" ? instagramUsername : null,
          pageId,
          instagramAccountId: platform === "instagram" ? instagramAccountId : null,
          accessTokenEnc: ciphertext,
          tokenIv: iv,
          tokenTag: tag,
          tokenExpiresAt,
          scopesGranted,
          isActive: true,
        },
        update: {
          platformUserId,
          instagramUsername: platform === "instagram" ? instagramUsername : null,
          pageId,
          instagramAccountId: platform === "instagram" ? instagramAccountId : null,
          accessTokenEnc: ciphertext,
          tokenIv: iv,
          tokenTag: tag,
          tokenExpiresAt,
          scopesGranted,
          isActive: true,
          lastRefreshedAt: new Date(),
        },
      });
    }

    const connectedList = platformsToWire.join(",");
    return NextResponse.redirect(
      new URL(`/profile?connected=${connectedList}`, request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
