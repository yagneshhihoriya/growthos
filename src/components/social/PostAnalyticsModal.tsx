"use client";

import * as React from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PublishedPost = {
  id: string;
  caption: string;
  imageUrl: string;
  igPostUrl: string | null;
  fbPostUrl: string | null;
  platforms: string[];
  publishedAt: string | null;
  analytics: Array<{
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    saves: number;
    profileVisits: number;
    fetchedAt: string;
  }>;
};

type AnalyticsRow = PublishedPost["analytics"][number];

export function PostAnalyticsModal({
  post,
  onClose,
}: {
  post: PublishedPost;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<AnalyticsRow[]>(post.analytics ?? []);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/social/posts/${post.id}/analytics`)
      .then((r) => r.json())
      .then((j: { analytics?: AnalyticsRow[] }) => {
        if (alive) setRows(j.analytics ?? []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [post.id]);

  const latest = rows[rows.length - 1] ?? post.analytics[0] ?? null;
  const chartData = rows.map((a) => ({
    date: format(new Date(a.fetchedAt), "dd MMM"),
    reach: a.reach,
    impressions: a.impressions,
    saves: a.saves,
    likes: a.likes,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[rgb(14,14,18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-text-primary">Post analytics</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-white/[0.03]">
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-3 line-clamp-4 text-sm text-text-secondary">{post.caption.split("\n")[0]}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
              {post.igPostUrl ? (
                <a href={post.igPostUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                  View on Instagram →
                </a>
              ) : null}
              {post.fbPostUrl ? (
                <a href={post.fbPostUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  View on Facebook →
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Reach" value={latest?.reach} color="text-orange-300" />
              <Metric label="Impressions" value={latest?.impressions} color="text-blue-300" />
              <Metric label="Saves" value={latest?.saves} color="text-purple-300" />
              <Metric label="Profile visits" value={latest?.profileVisits} color="text-teal-300" />
            </div>

            <div className="mt-5 h-48 rounded-xl bg-white/[0.02] p-2">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
                  Loading chart…
                </div>
              ) : chartData.length < 2 ? (
                <div className="flex h-full items-center justify-center text-center text-xs text-text-tertiary">
                  More data available after the next insights fetch (≈24h after publish).
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} stroke="#27272a" />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} stroke="#27272a" />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="reach" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="saves" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className={`text-xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}
