"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { KeywordRow } from "@/lib/title-pipeline";

export function KeywordList({ keywords }: { keywords: KeywordRow[] }) {
  async function copyKeyword(kw: string) {
    try {
      await navigator.clipboard.writeText(kw);
      toast.success("Copied", { description: kw });
    } catch {
      toast.error("Copy failed");
    }
  }

  if (!keywords.length) {
    return <p className="text-sm text-text-tertiary">No keyword data returned.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Keywords</p>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((k, i) => {
          const vol = k.estimatedVolume;
          const volClass =
            vol === "high"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : vol === "medium"
                ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                : "border-white/[0.08] bg-white/[0.04] text-text-secondary";
          return (
            <button
              key={`${k.keyword}-${i}`}
              type="button"
              onClick={() => void copyKeyword(k.keyword)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:brightness-110",
                volClass
              )}
              title="Click to copy"
            >
              {k.keyword}
              <span className="ml-1 text-[9px] opacity-70">({k.type})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
