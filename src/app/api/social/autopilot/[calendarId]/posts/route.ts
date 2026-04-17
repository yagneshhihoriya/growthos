import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { festivalsByDate } from "@/lib/indian-festivals";

/** GET /api/social/autopilot/:calendarId/posts
 *  Returns the calendar, its autopilot posts (ordered by `autopilotDay`),
 *  and the festival map for the month. */
export async function GET(
  _req: Request,
  { params }: { params: { calendarId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sellerId = session.user.id;

  const calendar = await db.autopilotCalendar.findFirst({
    where: { id: params.calendarId, sellerId },
  });
  if (!calendar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // For approved calendars, posts have scheduledFor set to days within the
  // chosen window; for drafts we find them by the autopilot flag + day.
  const posts = await db.socialPost.findMany({
    where: { sellerId, autopilotCalendarId: calendar.id },
    orderBy: [{ autopilotDay: "asc" }, { scheduledFor: "asc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          rawImageUrls: true,
          processedImages: true,
          price: true,
        },
      },
    },
  });

  return NextResponse.json({
    calendar,
    posts: posts.map((p) => ({
      ...p,
      product: p.product
        ? { ...p.product, price: p.product.price ? Number(p.product.price) : null }
        : null,
    })),
    festivals: festivalsByDate(calendar.year, calendar.month),
  });
}
