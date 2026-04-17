import type { SocialConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";

const GRAPH_VERSION = "v19.0";

function accessToken(conn: SocialConnection): string {
  return decrypt(conn.accessTokenEnc, conn.tokenIv, conn.tokenTag);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type PublishablePost = {
  id: string;
  caption: string;
  imageUrl: string;
};

/** Instagram Graph: create container → poll FINISHED → publish. Returns media id. */
export async function publishToInstagram(
  post: PublishablePost,
  conn: SocialConnection
): Promise<string> {
  const token = accessToken(conn);
  const igAccountId = conn.instagramAccountId;
  if (!igAccountId) throw new Error("Instagram account ID missing from connection record");

  const containerRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: post.imageUrl,
        caption: post.caption,
        access_token: token,
      }),
    }
  );

  const containerData = (await containerRes.json()) as {
    id?: string;
    error?: { message?: string; code?: number };
  };

  if (containerData.error) {
    throw new Error(
      `IG container creation failed: ${containerData.error.message ?? "unknown"} (code: ${containerData.error.code ?? "?"})`
    );
  }

  const mediaContainerId = containerData.id;
  if (!mediaContainerId) throw new Error("IG container response missing id");

  let containerStatus = "IN_PROGRESS";
  let attempts = 0;
  while (containerStatus.toUpperCase() === "IN_PROGRESS" && attempts < 10) {
    await sleep(3000);
    const statusRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaContainerId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    const statusData = (await statusRes.json()) as { status_code?: string; error?: { message?: string } };
    if (statusData.error) {
      throw new Error(`IG container status failed: ${statusData.error.message ?? "unknown"}`);
    }
    containerStatus = (statusData.status_code ?? "UNKNOWN").toUpperCase();
    attempts += 1;
  }

  if (containerStatus !== "FINISHED") {
    throw new Error(`IG container not ready after ${attempts} attempts. Status: ${containerStatus}`);
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: mediaContainerId,
        access_token: token,
      }),
    }
  );

  const publishData = (await publishRes.json()) as { id?: string; error?: { message?: string } };
  if (publishData.error) {
    throw new Error(`IG publish failed: ${publishData.error.message ?? "unknown"}`);
  }
  if (!publishData.id) throw new Error("IG publish response missing id");

  return publishData.id;
}

/** Resolve permalink for UI (shortcode URL when available). */
export async function fetchInstagramPermalink(
  mediaId: string,
  conn: SocialConnection
): Promise<string | null> {
  const token = accessToken(conn);
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`
  );
  const data = (await res.json()) as { permalink?: string; error?: { message?: string } };
  if (data.error || !data.permalink) return null;
  return data.permalink;
}

/** Facebook Page photo post. Returns post id or null on recoverable failure. */
export async function publishToFacebook(
  post: PublishablePost,
  conn: SocialConnection
): Promise<string | null> {
  const userToken = accessToken(conn);
  const pageId = conn.pageId;
  if (!pageId) {
    console.warn("[meta-post] Facebook pageId missing — skipping FB post");
    return null;
  }

  let pageToken = userToken;
  try {
    const pageTokRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`
    );
    const pageTokData = (await pageTokRes.json()) as { access_token?: string };
    if (pageTokData.access_token) pageToken = pageTokData.access_token;
  } catch {
    // fall back to user token
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: post.imageUrl,
      caption: post.caption,
      access_token: pageToken,
      published: true,
    }),
  });

  const data = (await res.json()) as { post_id?: string; id?: string; error?: { message?: string } };

  if (data.error) {
    console.error(`[meta-post] FB publish failed: ${data.error.message ?? "unknown"}`);
    return null;
  }

  return data.post_id ?? data.id ?? null;
}
