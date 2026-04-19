"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { PLATFORM_CONFIG, type GeneratedTitleResult } from "@/types/title-optimizer";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface TitleResultsProps {
  results: GeneratedTitleResult[];
  onTitleEdit?: (platform: GeneratedTitleResult["platform"], title: string) => void;
}

export function TitleResults({ results, onTitleEdit }: TitleResultsProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.confirm("Copied to clipboard");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!results.length) return null;

  return (
    <div className="mt-0 space-y-4">
      {results.map((r, idx) => {
        const config = PLATFORM_CONFIG[r.platform];
        const pct = r.charLimit ? Math.round((r.charCount / r.charLimit) * 100) : null;
        const barColor = pct && pct > 90 ? "bg-amber-500" : "bg-purple-500";

        return (
          <div key={r.platform} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{config.label}</span>
                {typeof r.beforeScore === "number" && typeof r.afterScore === "number" ? (
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    {r.beforeScore}/10 → {r.afterScore}/10
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void copy(r.title, `title-${r.platform}`)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-2 text-xs text-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-purple-200 sm:min-h-0 sm:min-w-0 sm:justify-end"
              >
                {copied === `title-${r.platform}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="hidden sm:inline">Copy title</span>
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div>
                {onTitleEdit ? (
                  <textarea
                    value={r.title}
                    onChange={(e) => onTitleEdit(r.platform, e.target.value)}
                    rows={3}
                    maxLength={r.charLimit ?? 500}
                    aria-label={`Edit ${config.label} title`}
                    className="mt-0 w-full resize-y rounded-md border border-border-default bg-bg-surface p-3 text-sm leading-relaxed text-text-primary focus:border-purple-500/35 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-text-primary">{r.title}</p>
                )}
                {r.charLimit ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {r.charCount} / {r.charLimit}
                    </span>
                  </div>
                ) : null}
              </div>

              {r.description ? (
                <div className="border-t border-white/[0.06] pt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-tertiary">Description</span>
                    <button
                      type="button"
                      onClick={() => void copy(r.description!, `desc-${r.platform}`)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-xs text-text-tertiary hover:bg-white/[0.04] hover:text-purple-200 sm:min-h-0 sm:min-w-0"
                    >
                      {copied === `desc-${r.platform}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span className="sr-only sm:not-sr-only sm:ml-1">Copy</span>
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">{r.description}</p>
                </div>
              ) : null}

              {r.keywords && r.keywords.length > 0 ? (
                <div className="border-t border-white/[0.06] pt-3">
                  <span className="mb-2 block text-xs font-medium text-text-tertiary">Keywords</span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.keywords.map((kw, i) => (
                      <span
                        key={`${kw}-${i}`}
                        className="rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-0.5 text-xs text-text-primary"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {idx === 0 && r.competitorInsights && r.competitorInsights.length > 0 ? (
                <div className="border-t border-white/[0.06] pt-3">
                  <span className="mb-2 block text-xs font-medium text-text-tertiary">Competitor insights</span>
                  <ul className="space-y-1">
                    {r.competitorInsights.map((insight, i) => (
                      <li key={i} className="flex gap-2 text-xs text-text-secondary">
                        <span className="shrink-0 text-amber-400">→</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
