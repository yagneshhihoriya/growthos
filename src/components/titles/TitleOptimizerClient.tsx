"use client";

import * as React from "react";
import { History, PenLine, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkCsvUploader } from "@/components/titles/BulkCsvUploader";
import { TitleOptimizerForm } from "@/components/titles/TitleOptimizerForm";
import { TitleHistory } from "@/components/titles/TitleHistory";

type Tab = "optimize" | "history" | "bulk";

export function TitleOptimizerClient() {
  const [tab, setTab] = React.useState<Tab>("optimize");
  const [historyNonce, setHistoryNonce] = React.useState(0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.05] to-transparent p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/20 ring-1 ring-amber-400/30 shadow-[0_6px_24px_-8px_rgba(245,158,11,0.4)]">
            <PenLine className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">Title Optimizer</h1>
            <p className="mt-1 text-sm text-text-tertiary">
              AI-generated marketplace titles, descriptions, and keywords for Amazon, Flipkart, Meesho, and Instagram — tuned for Indian buyers.
            </p>
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Title optimizer sections"
        className="flex w-full gap-1.5 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "optimize"}
          onClick={() => setTab("optimize")}
          className={cn(
            "inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all sm:px-4",
            tab === "optimize"
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/15 text-white ring-1 ring-amber-400/30 shadow-[0_4px_16px_-6px_rgba(245,158,11,0.35)]"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          )}
        >
          <PenLine className={cn("h-4 w-4 shrink-0", tab === "optimize" ? "text-amber-300" : "text-text-tertiary")} />
          <span className="hidden sm:inline">Single product</span>
          <span className="sm:hidden">Optimize</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={cn(
            "inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all sm:px-4",
            tab === "history"
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/15 text-white ring-1 ring-amber-400/30 shadow-[0_4px_16px_-6px_rgba(245,158,11,0.35)]"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          )}
        >
          <History className={cn("h-4 w-4 shrink-0", tab === "history" ? "text-amber-300" : "text-text-tertiary")} />
          <span className="hidden sm:inline">My optimizations</span>
          <span className="sm:hidden">History</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bulk"}
          onClick={() => setTab("bulk")}
          className={cn(
            "inline-flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all sm:px-4",
            tab === "bulk"
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/15 text-white ring-1 ring-amber-400/30 shadow-[0_4px_16px_-6px_rgba(245,158,11,0.35)]"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          )}
        >
          <Upload className={cn("h-4 w-4 shrink-0", tab === "bulk" ? "text-amber-300" : "text-text-tertiary")} />
          Bulk CSV
        </button>
      </div>

      <div className="animate-fade-in">
        {tab === "optimize" ? (
          <TitleOptimizerForm
            onSuccess={() => {
              setHistoryNonce((n) => n + 1);
            }}
          />
        ) : null}
        {tab === "history" ? <TitleHistory key={historyNonce} /> : null}
        {tab === "bulk" ? <BulkCsvUploader /> : null}
      </div>
    </div>
  );
}
