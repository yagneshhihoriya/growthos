"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { PostAnalyticsModal, type PublishedPost } from "./PostAnalyticsModal";

export function PostCard({ post }: { post: PublishedPost }) {
  const [open, setOpen] = React.useState(false);
  const a = post.analytics?.[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] text-left transition-colors hover:border-white/[0.16]"
      >
        <div className="relative aspect-square overflow-hidden bg-white/[0.04]">
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">No image</div>
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            {post.platforms.includes("instagram") ? (
              <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">IG</span>
            ) : null}
            {post.platforms.includes("facebook") ? (
              <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">FB</span>
            ) : null}
          </div>
        </div>

        <div className="p-3">
          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">
            {post.caption.split("\n")[0]}
          </p>

          <div className="mt-3 grid grid-cols-4 gap-1">
            <Mini label="Reach" value={a?.reach} />
            <Mini label="Likes" value={a?.likes} />
            <Mini label="Saves" value={a?.saves} />
            <Mini label="Comments" value={a?.comments} />
          </div>

          <p className="mt-2 text-[10px] text-text-tertiary">
            {post.publishedAt
              ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
              : "Awaiting publish"}
          </p>
        </div>
      </button>

      {open ? <PostAnalyticsModal post={post} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Mini({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg bg-white/[0.04] py-1.5 text-center">
      <div className="text-xs font-bold text-text-primary">{(value ?? 0).toLocaleString()}</div>
      <div className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}
