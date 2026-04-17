import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const EDITABLE_STATUSES = new Set(["draft", "scheduled", "failed"]);
const TERMINAL_STATUSES = new Set(["published", "pending_insights"]);

const PatchSchema = z.object({
  scheduledFor: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), { message: "Invalid date" }))
    .optional(),
  caption: z.string().min(1).max(2500).optional(),
  hashtags: z.array(z.string()).max(50).optional(),
  platforms: z.array(z.enum(["instagram", "facebook"])).min(1).optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
  imageUrl: z.string().url().optional(),
});

/** PATCH /api/social/posts/:id — reschedule or edit caption/image/platforms.
 *  Only allowed when the post hasn't been published yet. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const post = await db.socialPost.findUnique({ where: { id: params.id } });
  if (!post || post.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (TERMINAL_STATUSES.has(post.status)) {
    return NextResponse.json(
      { error: "Cannot edit a post that has already been published" },
      { status: 400 }
    );
  }
  if (!EDITABLE_STATUSES.has(post.status)) {
    return NextResponse.json(
      { error: `Cannot edit post in status '${post.status}'` },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.scheduledFor) {
    const d = new Date(parsed.data.scheduledFor);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledFor" }, { status: 400 });
    }
    data.scheduledFor = d;
    // Re-queue a failed post if the seller reschedules it.
    if (post.status === "failed") {
      data.status = "scheduled";
      data.retryCount = 0;
      data.errorMsg = null;
    }
  }
  if (parsed.data.caption !== undefined) data.caption = parsed.data.caption;
  if (parsed.data.hashtags !== undefined) data.hashtags = parsed.data.hashtags;
  if (parsed.data.platforms !== undefined) data.platforms = parsed.data.platforms;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  const updated = await db.socialPost.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ post: updated });
}

/** DELETE /api/social/posts/:id — hard delete a draft / scheduled / failed post.
 *  Published posts are preserved for analytics history. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await db.socialPost.findUnique({ where: { id: params.id } });
  if (!post || post.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (TERMINAL_STATUSES.has(post.status)) {
    return NextResponse.json(
      { error: "Cannot delete a published post (analytics history preserved)" },
      { status: 400 }
    );
  }

  await db.socialPost.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
