"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScorePayload = {
  total: number;
  breakdown: Record<string, number>;
  feedback: string;
};

function dimColor(score: number) {
  if (score < 40) return "bg-red-500/80";
  if (score < 70) return "bg-amber-400/90";
  return "bg-emerald-400/90";
}

function ScoreBlock({
  title,
  score,
  breakdown,
  feedback,
}: {
  title: string;
  score: number;
  breakdown: Record<string, number>;
  feedback: string;
}) {
  const dims = [
    { key: "keywordDensity", label: "Keywords" },
    { key: "charUtilization", label: "Chars" },
    { key: "clarity", label: "Clarity" },
    { key: "emotionalHook", label: "Hook" },
    { key: "compliance", label: "Compliance" },
  ];
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">{title}</p>
      <p className={cn("mt-2 text-4xl font-bold tabular-nums", score >= 70 ? "text-emerald-300" : score >= 40 ? "text-amber-200" : "text-red-300")}>
        {score}
        <span className="text-lg font-medium text-text-tertiary">/100</span>
      </p>
      <div className="mt-4 space-y-2">
        {dims.map(({ key, label }) => {
          const v = breakdown[key];
          const pct = typeof v === "number" ? Math.min(100, (v / 20) * 100) : 0;
          return (
            <div key={key}>
              <div className="mb-0.5 flex justify-between text-[10px] text-text-tertiary">
                <span>{label}</span>
                <span>{typeof v === "number" ? v : "—"}/20</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className={cn("h-full rounded-full transition-all", dimColor(typeof v === "number" ? v * 5 : 0))} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {feedback ? <p className="mt-3 text-xs text-text-secondary">{feedback}</p> : null}
    </div>
  );
}

export function TitleScoreCard({
  originalScore,
  optimizedScore,
}: {
  originalScore: ScorePayload | null;
  optimizedScore: ScorePayload;
}) {
  const delta =
    originalScore != null ? optimizedScore.total - originalScore.total : null;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Title score</p>
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        {originalScore ? (
          <ScoreBlock title="Before" score={originalScore.total} breakdown={originalScore.breakdown} feedback={originalScore.feedback} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.1] bg-black/20 p-4 text-sm text-text-tertiary">
            <p className="font-medium text-text-secondary">No &ldquo;before&rdquo; score</p>
            <p className="mt-1 text-xs">
              Tip: paste your current marketplace title above to see how much the new titles improve.
            </p>
          </div>
        )}
        <div className="hidden flex-col items-center gap-1 md:flex">
          <ArrowRight className="h-5 w-5 text-purple-400" />
          {delta != null ? (
            <span className={cn("text-sm font-bold", delta >= 0 ? "text-emerald-400" : "text-red-400")}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </span>
          ) : null}
        </div>
        <ScoreBlock title="After (Meesho title)" score={optimizedScore.total} breakdown={optimizedScore.breakdown} feedback={optimizedScore.feedback} />
      </div>
      {delta != null ? (
        <p className="text-center text-xs text-text-tertiary md:hidden">
          Change:{" "}
          <span className={cn("font-semibold", delta >= 0 ? "text-emerald-400" : "text-red-400")}>
            {delta >= 0 ? "+" : ""}
            {delta} pts
          </span>
        </p>
      ) : null}
    </div>
  );
}
