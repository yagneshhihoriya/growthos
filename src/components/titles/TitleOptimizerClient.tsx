"use client";

import * as React from "react";
import { History, PenLine, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkCsvUploader } from "@/components/titles/BulkCsvUploader";
import { TitleOptimizerForm } from "@/components/title-optimizer/title-optimizer-form";
import { TitleHistory } from "@/components/titles/TitleHistory";

type Tab = "optimize" | "history" | "bulk";

export function TitleOptimizerClient() {
  const [tab, setTab] = React.useState<Tab>("optimize");
  const [historyNonce, setHistoryNonce] = React.useState(0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="border-b border-white/[0.08]">
        <div
          role="tablist"
          aria-label="Title optimizer sections"
          className="flex w-full gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "optimize"}
            onClick={() => setTab("optimize")}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors sm:px-4",
              tab === "optimize"
                ? "border-purple-500 text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            )}
          >
            <PenLine className={cn("h-4 w-4 shrink-0", tab === "optimize" ? "text-purple-300" : "text-text-tertiary")} />
            <span className="hidden sm:inline">Single product</span>
            <span className="sm:hidden">Optimize</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "history"}
            onClick={() => setTab("history")}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors sm:px-4",
              tab === "history"
                ? "border-purple-500 text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            )}
          >
            <History className={cn("h-4 w-4 shrink-0", tab === "history" ? "text-purple-300" : "text-text-tertiary")} />
            <span className="hidden sm:inline">My optimizations</span>
            <span className="sm:hidden">History</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "bulk"}
            onClick={() => setTab("bulk")}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors sm:px-4",
              tab === "bulk"
                ? "border-purple-500 text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Upload className={cn("h-4 w-4 shrink-0", tab === "bulk" ? "text-purple-300" : "text-text-tertiary")} />
            Bulk CSV
          </button>
        </div>
      </div>

      <div className="animate-fade-in">
        {tab === "optimize" ? (
          <div className="space-y-2">
            <p className="text-sm text-text-tertiary">
              AI marketplace titles for Amazon, Flipkart, Meesho, and Instagram — tuned for Indian buyers.
            </p>
            <TitleOptimizerForm
              onSuccess={() => {
                setHistoryNonce((n) => n + 1);
              }}
            />
          </div>
        ) : null}
        {tab === "history" ? <TitleHistory key={historyNonce} /> : null}
        {tab === "bulk" ? <BulkCsvUploader /> : null}
      </div>
    </div>
  );
}
