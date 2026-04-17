import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNextBestTime } from "@/lib/social-utils";
import { toPublicPostableUrl } from "@/lib/post-image-url";

const ScheduleSchema = z.object({
  productId: z.string().optional(),
  imageUrl: z.string().min(1),
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string()).max(30),
  platforms: z.array(z.enum(["instagram", "facebook"])).min(1),
  /** ISO or datetime-local string accepted */
  scheduledFor: z.string().min(1).optional(),
  useAutoTime: z.boolean().default(false),
  /** Save as draft — no schedule; does not require Instagram. */
  saveAsDraft: z.boolean().optional(),
  isAutopilot: z.boolean().default(false),
  autopilotDay: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof ScheduleSchema>;
  try {
    body = ScheduleSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten().fieldErrors : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const saveAsDraft = body.saveAsDraft === true;

  if (!saveAsDraft) {
    const igConn = await db.socialConnection.findFirst({
      where: { sellerId: session.user.id, platform: "instagram", isActive: true },
    });
    if (!igConn) {
      return NextResponse.json(
        { error: "Instagram not connected. Please connect in Profile / Settings." },
        { status: 400 }
      );
    }
  }

  let publicImageUrl: string;
  try {
    publicImageUrl = await toPublicPostableUrl(body.imageUrl, session.user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid image URL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let scheduledFor: Date | null = null;
  let status: string;

  if (saveAsDraft) {
    scheduledFor = null;
    status = "draft";
  } else if (body.scheduledFor) {
    scheduledFor = new Date(body.scheduledFor);
    status = "scheduled";
  } else if (body.useAutoTime) {
    scheduledFor = getNextBestTime();
    status = "scheduled";
  } else {
    // Post as soon as cron runs: schedule in the past so publish cron picks it up.
    scheduledFor = new Date(Date.now() - 60_000);
    status = "scheduled";
  }

  const hasCf = Boolean(process.env.AWS_CLOUDFRONT_URL?.trim());
  if (
    !saveAsDraft &&
    scheduledFor &&
    !hasCf &&
    scheduledFor.getTime() - Date.now() > 23 * 60 * 60 * 1000
  ) {
    return NextResponse.json(
      {
        error:
          "Set AWS_CLOUDFRONT_URL for posts scheduled more than ~23 hours ahead (presigned image URLs expire).",
      },
      { status: 400 }
    );
  }

  const fullCaption =
    body.hashtags.length > 0
      ? `${body.caption}\n\n${body.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`
      : body.caption;

  const post = await db.socialPost.create({
    data: {
      sellerId: session.user.id,
      productId: body.productId ?? null,
      imageUrl: publicImageUrl,
      caption: fullCaption,
      hashtags: body.hashtags,
      platforms: body.platforms,
      status,
      scheduledFor,
      isAutopilot: body.isAutopilot,
      autopilotDay: body.autopilotDay ?? null,
    },
  });

  return NextResponse.json({ post, scheduledFor });
}
