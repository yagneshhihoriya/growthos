"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "purple" | "amber";

export function ChipMultiSelect({
  options,
  value,
  onChange,
  variant = "purple",
  className,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  variant?: ChipVariant;
  className?: string;
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  const activeCls =
    variant === "amber"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : "border-purple-500/40 bg-purple-500/15 text-purple-200";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? activeCls
                : "border-white/[0.08] bg-white/[0.02] text-text-secondary hover:border-white/[0.15]"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Single-select chip row — same visual language. */
export function ChipSingleSelect<T extends string>({
  options,
  value,
  onChange,
  variant = "purple",
  className,
  capitalize = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  variant?: ChipVariant;
  className?: string;
  capitalize?: boolean;
}) {
  const activeCls =
    variant === "amber"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : "border-purple-500/40 bg-purple-500/15 text-purple-200";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              capitalize && "capitalize",
              active
                ? activeCls
                : "border-white/[0.08] bg-white/[0.02] text-text-secondary hover:border-white/[0.15]"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
