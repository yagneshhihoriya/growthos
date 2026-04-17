import { NextResponse } from "next/server";
import type { Prisma, SocialPost } from "@prisma/client";
import { assertCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { toPublicPostableUrl } from "@/lib/post-image-url";
import {
  fetchInstagramPermalink,
  publishToFacebook,
  publishToInstagram,
  type PublishablePost,
} from "@/lib/meta-post";

export const dynamic = "force-dynamic";

const dueInclude = {
  seller: {
    include: {
      socialConnections: {
        where: { isActive: true, platform: { in: ["instagram", "facebook"] } },
      },
    },
  },
} satisfies Prisma.SocialPostInclude;

type DuePost = Prisma.SocialPostGetPayload<{ include: typeof dueInclude }>;

export async function GET(req: Request) {
  const denied = assertCronSecret(req);
  if (denied) return denied;

  const now = new Date();

  const duePosts = await db.socialPost.findMany({
    where: {
      status: "scheduled",
      scheduledFor: { lte: now },
    },
    include: dueInclude,
    take: 50,
  });

  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
  }

  const results = await Promise.allSettled(duePosts.map((p) => publishOne(p)));

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    processed: duePosts.length,
    succeeded,
    failed,
  });
}

async function publishOne(post: DuePost): Promise<void> {
  const connections = post.seller.socialConnections;
  const igConn = connections.find((c) => c.platform === "instagram");
  const fbConn = connections.find((c) => c.platform === "facebook");

  const igRequested = post.platforms.includes("instagram");
  const fbRequested = post.platforms.includes("facebook");

  if (igRequested && !igConn) {
    await db.socialPost.update({
      where: { id: post.id },
      data: {
        status: "failed",
        errorMsg: "Instagram not connected. Please reconnect in Profile.",
      },
    });
    return;
  }

  let publicImageUrl: string;
  try {
    publicImageUrl = await toPublicPostableUrl(post.imageUrl, post.sellerId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image URL resolution failed";
    await markFailedRetry(
      { id: post.id, retryCount: post.retryCount, scheduledFor: post.scheduledFor },
      msg
    );
    throw e;
  }

  const payload: PublishablePost = {
    id: post.id,
    caption: post.caption,
    imageUrl: publicImageUrl,
  };

  try {
    let igPostId: string | null = null;
    let fbPostId: string | null = null;
    let igPostUrl: string | null = null;
    const fbPostUrl: string | null = null;

    if (igRequested && igConn) {
      igPostId = await publishToInstagram(payload, igConn);
      igPostUrl = (await fetchInstagramPermalink(igPostId, igConn)) ?? null;
    }

    if (fbRequested && fbConn) {
      fbPostId = await publishToFacebook(payload, fbConn);
    }

    await db.socialPost.update({
      where: { id: post.id },
      data: {
        status: "pending_insights",
        publishedAt: new Date(),
        igPostId,
        fbPostId,
        igPostUrl,
        fbPostUrl,
        errorMsg: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    await markFailedRetry(
      { id: post.id, retryCount: post.retryCount, scheduledFor: post.scheduledFor },
      message
    );
    throw err;
  }
}

async function markFailedRetry(
  post: Pick<SocialPost, "id" | "retryCount" | "scheduledFor">,
  errorMsg: string
): Promise<void> {
  const newRetryCount = post.retryCount + 1;
  await db.socialPost.update({
    where: { id: post.id },
    data: {
      retryCount: newRetryCount,
      errorMsg,
      status: newRetryCount >= 3 ? "failed" : "scheduled",
      scheduledFor:
        newRetryCount < 3 ? new Date(Date.now() + 10 * 60 * 1000) : post.scheduledFor,
    },
  });
}
