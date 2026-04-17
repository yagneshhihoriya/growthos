import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBestTimeForDate } from "@/lib/social-utils";

const InputSchema = z.object({
  calendarId: z.string().cuid(),
  /** IST calendar day (YYYY-MM-DD) to schedule day 1 on. */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
});

/**
 * POST /api/social/autopilot/approve
 *
 * Assigns a concrete `scheduledFor` to every autopilot draft post, one per
 * day starting from `startDate`, at that day's best posting time (IST).
 * Marks the calendar `approved`. Requires every post to have a non-empty
 * `imageUrl` — the wizard blocks Approve otherwise.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sellerId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const calendar = await db.autopilotCalendar.findFirst({
    where: { id: parsed.data.calendarId, sellerId },
  });
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }
  if (calendar.status !== "draft") {
    return NextResponse.json(
      { error: `Calendar is already ${calendar.status}` },
      { status: 409 }
    );
  }

  // Require a valid image on every post before approval.
  const drafts = await db.socialPost.findMany({
    where: {
      sellerId,
      autopilotCalendarId: calendar.id,
      status: "draft",
      scheduledFor: null,
    },
    orderBy: { autopilotDay: "asc" },
  });
  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "No draft posts in this calendar — regenerate first" },
      { status: 400 }
    );
  }
  const missingImage = drafts.filter((p) => !p.imageUrl || p.imageUrl.trim() === "");
  if (missingImage.length > 0) {
    return NextResponse.json(
      {
        error: `${missingImage.length} posts are missing images. Assign an image to every day before approving.`,
        missingDays: missingImage.map((p) => p.autopilotDay),
      },
      { status: 400 }
    );
  }

  // Anchor the start date at noon IST so we never slide into the previous UTC day.
  const start = new Date(`${parsed.data.startDate}T12:00:00+05:30`);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    for (const post of drafts) {
      const offsetDays = Math.max(0, (post.autopilotDay ?? 1) - 1);
      const slotAnchor = new Date(start.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      const scheduledFor = getBestTimeForDate(slotAnchor);
      await tx.socialPost.update({
        where: { id: post.id },
        data: { scheduledFor, status: "scheduled" },
      });
    }

    await tx.autopilotCalendar.update({
      where: { id: calendar.id },
      data: { status: "active", approvedAt: new Date() },
    });
  });

  return NextResponse.json({
    approved: drafts.length,
    calendarId: calendar.id,
    startDate: parsed.data.startDate,
    ok: true,
  });
}
