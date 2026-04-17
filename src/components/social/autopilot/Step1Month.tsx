"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  month: number;
  year: number;
  onChange: (m: number, y: number) => void;
  onNext: () => void;
};

function monthOptions(): Array<{ m: number; y: number; label: string }> {
  const now = new Date();
  const options: Array<{ m: number; y: number; label: string }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      m: d.getMonth() + 1,
      y: d.getFullYear(),
      label: d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

export function AutopilotStep1Month({ month, year, onChange, onNext }: Props) {
  const options = React.useMemo(() => monthOptions(), []);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Which month do you want to automate?</h2>
        <p className="mt-1 text-sm text-text-tertiary">
          We&rsquo;ll generate 30 days of posts aligned with festivals and best times.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((opt) => {
          const active = opt.m === month && opt.y === year;
          return (
            <button
              key={`${opt.m}-${opt.y}`}
              type="button"
              onClick={() => onChange(opt.m, opt.y)}
              className={cn(
                "rounded-xl border p-5 text-left transition-colors",
                active
                  ? "border-purple-500/40 bg-purple-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Month</p>
              <p className="mt-1 text-base font-medium text-text-primary">{opt.label}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onNext}>
          Next: Select products →
        </Button>
      </div>
    </div>
  );
}
