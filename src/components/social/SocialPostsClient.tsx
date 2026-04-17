"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectInstagram } from "@/components/social/ConnectInstagram";
import { PostComposer } from "@/components/social/PostComposer";
import { ScheduleCalendar } from "@/components/social/ScheduleCalendar";
import { PublishedGrid } from "@/components/social/PublishedGrid";
import { AutopilotWizard } from "@/components/social/AutopilotWizard";

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

export function SocialPostsClient() {
  const [connections, setConnections] = React.useState<Connection[]>([]);
  const [posts, setPosts] = React.useState<PostRow[]>([]);
  const [tab, setTab] = React.useState<"compose" | "scheduled" | "published" | "autopilot">(
    "compose"
  );

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
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Social Posts</h1>
        <p className="mt-1 text-sm text-text-tertiary">Compose, schedule, and publish to Instagram & Facebook.</p>
      </div>

      <ConnectInstagram />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="flex h-auto w-full gap-1 overflow-x-auto whitespace-nowrap bg-white/[0.03] p-1">
          <TabsTrigger value="compose" className="text-xs sm:text-sm">
            ✏️ Compose
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs sm:text-sm">
            📅 Scheduled
          </TabsTrigger>
          <TabsTrigger value="published" className="text-xs sm:text-sm">
            📊 Published
          </TabsTrigger>
          <TabsTrigger value="autopilot" className="text-xs sm:text-sm">
            🤖 30-Day Auto
            <span className="ml-1 rounded-full bg-purple-500 px-1.5 py-0.5 text-[8px] font-bold text-white">NEW</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="mt-4">
          <ScheduleCalendar />
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          <PublishedGrid onGoCompose={() => setTab("compose")} />
        </TabsContent>

        <TabsContent value="autopilot" className="mt-4">
          <AutopilotWizard onViewScheduled={() => setTab("scheduled")} />
        </TabsContent>

        <TabsContent value="compose" className="mt-4 space-y-6">
          <PostComposer
            hasInstagram={hasInstagram}
            hasFacebook={hasFacebook}
            onScheduled={() => {
              void loadPosts();
            }}
          />

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Recent (20)</p>
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {posts.length === 0 ? (
                <li className="py-6 text-center text-sm text-text-tertiary">No posts yet.</li>
              ) : (
                posts.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text-primary">{p.caption.slice(0, 80)}…</p>
                      <p className="text-[11px] text-text-tertiary">
                        {p.platforms.join(", ")} · {p.status}
                        {p.scheduledFor ? ` · ${formatDistanceToNow(new Date(p.scheduledFor), { addSuffix: true })}` : ""}
                      </p>
                      {p.errorMsg ? <p className="text-[11px] text-red-400">{p.errorMsg}</p> : null}
                    </div>
                    <div className="shrink-0 text-[11px] text-text-tertiary">
                      {p.igPostUrl ? (
                        <a href={p.igPostUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                          Open
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
