"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitorToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function CompetitorToggle({ value, onChange }: CompetitorToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!value);
        }
      }}
      onClick={() => onChange(!value)}
      className={cn(
        "comp-toggle-btn flex min-h-[44px] w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-all",
        "border-white/[0.08] bg-black/20 hover:border-purple-500/30",
        value && "border-purple-500/60 bg-purple-500/[0.14] ring-1 ring-purple-500/25"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
          value ? "border-purple-400 bg-purple-500" : "border-white/[0.15] bg-black/30"
        )}
      >
        {value ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} /> : null}
      </div>
      <div>
        <p className={cn("mb-0.5 text-xs font-medium", value ? "text-purple-50" : "text-text-primary")}>
          Include competitor analysis
        </p>
        <p className={cn("text-xs leading-relaxed", value ? "text-purple-100/90" : "text-text-tertiary")}>
          Scans top Meesho + Amazon listings for your category and highlights keyword gaps — adds ~10s to generation.
        </p>
      </div>
    </button>
  );
}
