"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PostCard } from "./PostCard";
import type { PublishedPost } from "./PostAnalyticsModal";

type SortKey = "reach" | "likes" | "saves" | "recent";

export function PublishedGrid({ onGoCompose }: { onGoCompose?: () => void } = {}) {
  const [posts, setPosts] = React.useState<PublishedPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<SortKey>("reach");

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch("/api/social/posts?status=published&take=100").then((r) => r.json()),
      fetch("/api/social/posts?status=pending_insights&take=100").then((r) => r.json()),
    ])
      .then(([a, b]: [{ posts?: PublishedPost[] }, { posts?: PublishedPost[] }]) => {
        if (!alive) return;
        setPosts([...(a.posts ?? []), ...(b.posts ?? [])]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const sorted = React.useMemo(() => {
    const arr = [...posts];
    if (sortBy === "recent") {
      arr.sort((x, y) => {
        const xT = x.publishedAt ? new Date(x.publishedAt).getTime() : 0;
        const yT = y.publishedAt ? new Date(y.publishedAt).getTime() : 0;
        return yT - xT;
      });
    } else {
      arr.sort((x, y) => {
        const xv = x.analytics?.[0]?.[sortBy] ?? 0;
        const yv = y.analytics?.[0]?.[sortBy] ?? 0;
        return yv - xv;
      });
    }
    return arr;
  }, [posts, sortBy]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["reach", "likes", "saves", "recent"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSortBy(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
              sortBy === s
                ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                : "border-white/[0.08] text-text-tertiary hover:text-text-secondary"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center text-sm text-text-tertiary">
          Loading published posts…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <p className="text-3xl">📊</p>
          <p className="mt-2 text-sm text-text-secondary">No published posts yet</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Posts will show up here after they go live and insights are fetched (≈24h later).
          </p>
          {onGoCompose ? (
            <button
              type="button"
              onClick={onGoCompose}
              className="mt-4 inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
            >
              Compose your first post →
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
