import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { festivalsByDate } from "@/lib/indian-festivals";
import {
  generateAutopilotCalendar,
  type AutopilotProductRef,
} from "@/lib/autopilot-gen";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout (Hobby ok)

const InputSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
  productIds: z.array(z.string().cuid()).min(1).max(10),
  language: z.enum(["hinglish", "hindi", "english"]).default("hinglish"),
});

/**
 * POST /api/social/autopilot/generate
 *
 * Generates 30 draft posts for the given month. If a calendar already exists
 * for the same (seller, month, year) and is still in `draft`, its old
 * autopilot posts are cleared and regenerated. Approved calendars are
 * returned as-is (to prevent accidental overwrite after scheduling).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { month, year, productIds, language } = parsed.data;
  const sellerId = session.user.id;

  const products = await db.product.findMany({
    where: { id: { in: productIds }, sellerId, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      colors: true,
      fabric: true,
      rawImageUrls: true,
    },
  });
  if (products.length === 0) {
    return NextResponse.json(
      { error: "None of the selected products were found" },
      { status: 400 }
    );
  }

  const existing = await db.autopilotCalendar.findUnique({
    where: { sellerId_month_year: { sellerId, month, year } },
  });
  if (existing && existing.status !== "draft") {
    return NextResponse.json(
      {
        error: `Calendar for ${month}/${year} is already ${existing.status}. Review it in the Scheduled tab.`,
      },
      { status: 409 }
    );
  }

  const productRefs: AutopilotProductRef[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category ?? null,
    price: p.price ? Number(p.price) : null,
    colors: p.colors ?? [],
    fabric: p.fabric ?? null,
  }));

  let plan;
  try {
    plan = await generateAutopilotCalendar({
      year,
      month,
      products: productRefs,
      language,
      festivalsByDate: festivalsByDate(year, month),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    console.error("[autopilot/generate]", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const productById = new Map(products.map((p) => [p.id, p]));

  const calendar = await db.$transaction(async (tx) => {
    const cal = await tx.autopilotCalendar.upsert({
      where: { sellerId_month_year: { sellerId, month, year } },
      create: {
        sellerId,
        month,
        year,
        status: "draft",
        totalPosts: plan.length,
      },
      update: {
        status: "draft",
        totalPosts: plan.length,
        approvedAt: null,
      },
    });

    // Clear previous draft posts for THIS calendar (by its id) so regenerate is
    // idempotent without wiping drafts that belong to other months/calendars.
    await tx.socialPost.deleteMany({
      where: {
        sellerId,
        isAutopilot: true,
        status: "draft",
        scheduledFor: null,
        autopilotCalendarId: cal.id,
      },
    });

    for (const day of plan) {
      const product = productById.get(day.productId);
      const imageUrl = product?.rawImageUrls?.[0] ?? "";
      await tx.socialPost.create({
        data: {
          sellerId,
          productId: day.productId,
          imageUrl,
          caption: day.caption,
          hashtags: day.hashtags,
          platforms: ["instagram"],
          status: "draft",
          scheduledFor: null,
          isAutopilot: true,
          autopilotDay: day.day,
          autopilotCalendarId: cal.id,
        },
      });
    }

    return cal;
  });

  const posts = await db.socialPost.findMany({
    where: { sellerId, autopilotCalendarId: calendar.id },
    orderBy: { autopilotDay: "asc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          rawImageUrls: true,
          processedImages: true,
          price: true,
          category: true,
        },
      },
    },
  });

  return NextResponse.json({
    calendarId: calendar.id,
    calendar,
    posts: posts.map((p) => ({
      ...p,
      product: p.product
        ? { ...p.product, price: p.product.price ? Number(p.product.price) : null }
        : null,
    })),
    festivals: festivalsByDate(year, month),
  });
}
