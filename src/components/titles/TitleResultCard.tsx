"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { PLATFORM_CHAR_LIMITS, type PlatformKey } from "@/lib/title-pipeline";

const LABELS: Record<PlatformKey, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  meesho: "Meesho",
  instagram: "Instagram",
};

export function TitleResultCard({
  platform,
  title,
  optimizationId,
  appliedPlatforms,
  onAppliedPlatformsChange,
}: {
  platform: PlatformKey;
  title: string;
  optimizationId: string;
  appliedPlatforms: string[];
  onAppliedPlatformsChange: (platforms: string[]) => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const len = title.length;
  const over = len > limit;

  async function copy() {
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      toast.success("Copied", `${LABELS[platform]} title copied.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function markApplied() {
    const next = Array.from(new Set([...appliedPlatforms, platform]));
    setSaving(true);
    try {
      const res = await fetch(`/api/titles/${optimizationId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: next }),
      });
      const json = (await res.json()) as { error?: string; optimization?: { appliedPlatforms: string[]; isApplied: boolean } };
      if (!res.ok) throw new Error(json.error ?? "Apply failed");
      onAppliedPlatformsChange(json.optimization?.appliedPlatforms ?? next);
      toast.success("Saved", `Marked ${LABELS[platform]} as applied.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setSaving(false);
    }
  }

  const thisApplied = appliedPlatforms.includes(platform);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{LABELS[platform]}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
              over ? "bg-red-500/20 text-red-300" : "bg-white/[0.06] text-text-tertiary"
            )}
          >
            {len}/{limit}
          </span>
          {thisApplied ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <Check className="h-3 w-3" />
              Applied
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => void copy()}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {!thisApplied ? (
            <Button type="button" size="sm" variant="brand-outline" disabled={saving} onClick={() => void markApplied()}>
              {saving ? "…" : "Mark applied"}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-primary">{title}</p>
    </div>
  );
}
