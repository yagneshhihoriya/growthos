"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Festival } from "@/lib/indian-festivals";
import { AutopilotPostEditSheet, type AutopilotPost } from "./PostEditSheet";

type Props = {
  calendarResult: {
    calendar: { id: string; month: number; year: number; status: string; totalPosts: number };
    posts: AutopilotPost[];
    festivals: Record<string, Festival>;
  };
  month: number;
  year: number;
  onBack: () => void;
  onApproved: (scheduledCount: number) => void;
};

function tomorrowIsoDate(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AutopilotStep4Review({ calendarResult, month, year, onBack, onApproved }: Props) {
  const [posts, setPosts] = React.useState<AutopilotPost[]>(calendarResult.posts);
  const [selected, setSelected] = React.useState<AutopilotPost | null>(null);
  const [approving, setApproving] = React.useState(false);
  const [startDate, setStartDate] = React.useState(tomorrowIsoDate());
  const [confirming, setConfirming] = React.useState(false);

  const missingCount = posts.filter((p) => !p.imageUrl || p.imageUrl.trim() === "").length;
  const festivals = calendarResult.festivals;

  async function approve() {
    setApproving(true);
    try {
      const res = await fetch("/api/social/autopilot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: calendarResult.calendar.id, startDate }),
      });
      const json = (await res.json()) as {
        approved?: number;
        scheduled?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Approve failed");
      const count = json.approved ?? json.scheduled ?? posts.length;
      toast.success(`${count} posts scheduled`, {
        description: "View them in the Scheduled tab",
      });
      onApproved(count);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Your {new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })} calendar is ready
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">Review every day, assign images where missing, then approve.</p>
      </div>

      {missingCount > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          ⚠️ {missingCount} of {posts.length} days are missing images. Tap any day below to assign one.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          ✓ All {posts.length} days have images. Ready to approve.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {posts.map((p) => {
          const date = datePart(p);
          const fest = festivals[date];
          const hasImg = Boolean(p.imageUrl?.trim());
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={cn(
                "relative overflow-hidden rounded-lg border p-2 text-left transition-colors",
                hasImg
                  ? "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
                  : "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/60"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-semibold text-text-tertiary">Day {p.autopilotDay ?? "—"}</span>
                {fest ? (
                  <span className="rounded bg-purple-500/15 px-1 py-0.5 text-[9px] text-purple-200">
                    🎉 {fest.name.split(" ")[0]}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 aspect-square overflow-hidden rounded bg-white/[0.04]">
                {hasImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-amber-300">
                    + Add image
                  </div>
                )}
              </div>
              <p className="mt-1 truncate text-[11px] text-text-secondary">{p.product?.name ?? "Product"}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] italic text-text-tertiary">
                {p.caption.split("\n")[0]}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Start posting from</p>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 max-w-[200px]"
            min={tomorrowIsoDate()}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          {confirming ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void approve()} disabled={approving} className="gap-2">
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm · schedule {posts.length} posts
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={missingCount > 0 || approving}
              className="gap-2"
            >
              Approve calendar →
            </Button>
          )}
        </div>
      </div>

      <AutopilotPostEditSheet
        post={selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) => {
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        }}
      />
    </div>
  );
}

function datePart(p: AutopilotPost): string {
  // Draft autopilot posts don't have scheduledFor yet; we infer the date from
  // calendarResult.calendar + autopilotDay.
  if (p.scheduledFor) return p.scheduledFor.slice(0, 10);
  return "";
}
