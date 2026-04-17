import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v19.0";

export async function GET(req: Request) {
  const denied = assertCronSecret(req);
  if (denied) return denied;

  const horizon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  const expiringConnections = await db.socialConnection.findMany({
    where: {
      platform: { in: ["instagram", "facebook"] },
      isActive: true,
      tokenExpiresAt: { lte: horizon },
    },
  });

  let refreshed = 0;
  let failed = 0;
  let deactivated = 0;

  for (const conn of expiringConnections) {
    try {
      const currentToken = decrypt(conn.accessTokenEnc, conn.tokenIv, conn.tokenTag);
      const clientId = process.env.META_CLIENT_ID;
      const clientSecret = process.env.META_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        failed += 1;
        continue;
      }

      const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
      url.searchParams.set("grant_type", "fb_exchange_token");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("client_secret", clientSecret);
      url.searchParams.set("fb_exchange_token", currentToken);

      const response = await fetch(url.toString());
      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
        error?: { message?: string };
      };

      if (data.error || !data.access_token) {
        await db.socialConnection.update({
          where: { id: conn.id },
          data: { isActive: false },
        });
        deactivated += 1;
        continue;
      }

      const { ciphertext, iv, tag } = encrypt(data.access_token);
      const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 60 * 24 * 60 * 60;

      await db.socialConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEnc: ciphertext,
          tokenIv: iv,
          tokenTag: tag,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
          lastRefreshedAt: new Date(),
          isActive: true,
        },
      });
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    refreshed,
    failed,
    deactivated,
    total: expiringConnections.length,
  });
}
