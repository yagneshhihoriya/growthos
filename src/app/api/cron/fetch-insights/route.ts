import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { assertCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { startOfISTDayContaining } from "@/lib/social-utils";

export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v19.0";

const postInclude = {
  seller: {
    include: {
      socialConnections: {
        where: { platform: "instagram", isActive: true },
      },
    },
  },
} satisfies Prisma.SocialPostInclude;

type InsightPost = Prisma.SocialPostGetPayload<{ include: typeof postInclude }>;

export async function GET(req: Request) {
  const denied = assertCronSecret(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);

  const posts = await db.socialPost.findMany({
    where: {
      status: "pending_insights",
      publishedAt: { lte: cutoff },
      igPostId: { not: null },
    },
    include: postInclude,
    take: 100,
  });

  if (posts.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, skipped: 0, failed: 0 });
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of posts) {
    try {
      const r = await fetchInsightsForPost(p);
      if (r === "published") succeeded += 1;
      else skipped += 1;
    } catch (e) {
      failed += 1;
      console.error(`[fetch-insights] post ${p.id}`, e);
    }
  }

  return NextResponse.json({
    processed: posts.length,
    succeeded,
    skipped,
    failed,
  });
}

async function fetchInsightsForPost(
  post: InsightPost
): Promise<"published" | "skipped"> {
  const conn = post.seller.socialConnections[0];
  if (!conn || !post.igPostId) return "skipped";

  const token = decrypt(conn.accessTokenEnc, conn.tokenIv, conn.tokenTag);

  const metricsPrimary =
    "reach,impressions,likes,comments,saved,profile_visits";
  let metricsRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${post.igPostId}/insights?metric=${metricsPrimary}&access_token=${encodeURIComponent(token)}`
  );
  let metricsData = (await metricsRes.json()) as InsightsResponse;

  if (metricsData.error) {
    const metricsFallback = "reach,impressions,comments,saved";
    metricsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${post.igPostId}/insights?metric=${metricsFallback}&access_token=${encodeURIComponent(token)}`
    );
    metricsData = (await metricsRes.json()) as InsightsResponse;
  }

  if (metricsData.error) {
    console.error(`[fetch-insights] IG API error for ${post.igPostId}:`, metricsData.error.message);
    return "skipped";
  }

  const metrics = parseInsights(metricsData);

  const fetchedAt = startOfISTDayContaining(new Date());

  await db.postAnalytic.upsert({
    where: {
      postId_fetchedAt: {
        postId: post.id,
        fetchedAt,
      },
    },
    create: {
      postId: post.id,
      sellerId: post.sellerId,
      reach: metrics.reach,
      impressions: metrics.impressions,
      likes: metrics.likes,
      comments: metrics.comments,
      saves: metrics.saves,
      profileVisits: metrics.profileVisits,
      linkClicks: metrics.linkClicks,
      fetchedAt,
    },
    update: {
      reach: metrics.reach,
      impressions: metrics.impressions,
      likes: metrics.likes,
      comments: metrics.comments,
      saves: metrics.saves,
      profileVisits: metrics.profileVisits,
      linkClicks: metrics.linkClicks,
    },
  });

  await db.socialPost.update({
    where: { id: post.id },
    data: { status: "published" },
  });

  return "published";
}

type InsightsResponse = {
  data?: Array<{ name: string; values?: Array<{ value?: number }> }>;
  error?: { message?: string };
};

function parseInsights(metricsData: InsightsResponse): {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  profileVisits: number;
  linkClicks: number;
} {
  const out = {
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    profileVisits: 0,
    linkClicks: 0,
  };
  for (const item of metricsData.data ?? []) {
    const v = item.values?.[0]?.value ?? 0;
    switch (item.name) {
      case "reach":
        out.reach = v;
        break;
      case "impressions":
        out.impressions = v;
        break;
      case "likes":
        out.likes = v;
        break;
      case "comments":
        out.comments = v;
        break;
      case "saved":
      case "saves":
        out.saves = v;
        break;
      case "profile_visits":
      case "profile_views":
        out.profileVisits = v;
        break;
      default:
        break;
    }
  }
  return out;
}
