"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  PenSquare,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectInstagram } from "@/components/social/ConnectInstagram";
import { PostComposer } from "@/components/social/PostComposer";
import { ScheduleCalendar } from "@/components/social/ScheduleCalendar";
import { PublishedGrid } from "@/components/social/PublishedGrid";
import { AutopilotWizard } from "@/components/social/AutopilotWizard";

type TabId = "compose" | "scheduled" | "published" | "autopilot";

type Connection = { platform: string; isActive: boolean };
type PostRow = {
  id: string;
  status: string;
  platforms: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  igPostUrl: string | null;
  errorMsg: string | null;
  createdAt: string;
  caption: string;
};

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: "compose", label: "Compose", icon: PenSquare },
  { id: "scheduled", label: "Scheduled", icon: CalendarDays },
  { id: "published", label: "Published", icon: BarChart3 },
  { id: "autopilot", label: "30-Day Auto", icon: Sparkles, badge: "NEW" },
];

export function SocialPostsClient() {
  const [connections, setConnections] = React.useState<Connection[]>([]);
  const [posts, setPosts] = React.useState<PostRow[]>([]);
  const [tab, setTab] = React.useState<TabId>("compose");

  const loadConnections = React.useCallback(async () => {
    const res = await fetch("/api/social/connections");
    const json = (await res.json()) as { connections?: Connection[] };
    setConnections(json.connections ?? []);
  }, []);

  const loadPosts = React.useCallback(async () => {
    const res = await fetch("/api/social/posts");
    const json = (await res.json()) as { posts?: PostRow[] };
    setPosts(json.posts ?? []);
  }, []);

  React.useEffect(() => {
    void loadConnections();
    void loadPosts();
  }, [loadConnections, loadPosts]);

  const hasInstagram = Boolean(connections.find((c) => c.platform === "instagram" && c.isActive));
  const hasFacebook = Boolean(connections.find((c) => c.platform === "facebook" && c.isActive));

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-500/[0.08] via-purple-500/[0.05] to-transparent p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-purple-500/20 ring-1 ring-fuchsia-400/30 shadow-[0_6px_24px_-8px_rgba(217,70,239,0.45)]">
            <Share2 className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
              Social Posts
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Compose, schedule, and publish to Instagram & Facebook — with AI-crafted captions and a 30-day autopilot plan.
            </p>
          </div>
        </div>
      </div>

      {/* Meta connections */}
      <ConnectInstagram />

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Social posts views"
        className="flex w-full gap-1.5 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "group relative inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all sm:px-4",
                active
                  ? "bg-gradient-to-br from-fuchsia-500/20 to-purple-500/15 text-white ring-1 ring-fuchsia-400/30 shadow-[0_4px_16px_-6px_rgba(217,70,239,0.45)]"
                  : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-fuchsia-300" : "text-text-tertiary group-hover:text-text-secondary"
                )}
              />
              <span>{t.label}</span>
              {t.badge ? (
                <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white shadow-sm">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="animate-fade-in">
        {tab === "compose" && (
          <div className="space-y-6">
            <PostComposer
              hasInstagram={hasInstagram}
              hasFacebook={hasFacebook}
              onScheduled={() => {
                void loadPosts();
              }}
            />

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Recent (20)</p>
                {posts.length > 0 ? (
                  <span className="text-[11px] text-text-tertiary">{posts.length} items</span>
                ) : null}
              </div>
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {posts.length === 0 ? (
                  <li className="py-10 text-center">
                    <p className="text-sm text-text-tertiary">No posts yet.</p>
                    <p className="mt-1 text-[11px] text-text-tertiary">Your drafts and scheduled posts will appear here.</p>
                  </li>
                ) : (
                  posts.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">
                          {p.caption.slice(0, 80)}
                          {p.caption.length > 80 ? "…" : ""}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
                          <span className="capitalize">{p.platforms.join(", ")}</span>
                          <span>·</span>
                          <StatusPill status={p.status} />
                          {p.scheduledFor ? (
                            <>
                              <span>·</span>
                              <span>{formatDistanceToNow(new Date(p.scheduledFor), { addSuffix: true })}</span>
                            </>
                          ) : null}
                        </p>
                        {p.errorMsg ? (
                          <p className="mt-0.5 text-[11px] text-red-400">{p.errorMsg}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-[11px] text-text-tertiary">
                        {p.igPostUrl ? (
                          <a
                            href={p.igPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {tab === "scheduled" && <ScheduleCalendar />}
        {tab === "published" && <PublishedGrid onGoCompose={() => setTab("compose")} />}
        {tab === "autopilot" && <AutopilotWizard onViewScheduled={() => setTab("scheduled")} />}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const style =
    s === "published"
      ? "bg-emerald-500/15 text-emerald-300"
      : s === "failed"
        ? "bg-red-500/15 text-red-300"
        : s === "draft"
          ? "bg-white/[0.06] text-text-secondary"
          : "bg-amber-500/15 text-amber-300";
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize", style)}>
      {status}
    </span>
  );
}
