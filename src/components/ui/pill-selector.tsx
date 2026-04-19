"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PillOption {
  value: string;
  label: string;
  sub?: string;
}

interface PillSelectorProps {
  options: PillOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  variant?: "default" | "card";
  accent?: "emerald" | "purple";
  "aria-label"?: string;
  className?: string;
}

export function PillSelector({
  options,
  value,
  onChange,
  multi = false,
  variant = "default",
  accent = "purple",
  "aria-label": ariaLabel = "Options",
  className,
}: PillSelectorProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const isActive = (v: string) => (multi ? (value as string[]).includes(v) : value === v);
  const a = accent === "purple";

  const handleClick = (v: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  };

  const setRovingTab = (focusedIndex: number) => {
    if (multi) return;
    const el = rootRef.current;
    if (!el) return;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("[data-pill]"));
    buttons.forEach((btn, i) => {
      btn.tabIndex = i === focusedIndex ? 0 : -1;
    });
  };

  const moveFocus = (fromIndex: number, delta: number) => {
    const el = rootRef.current;
    if (!el) return;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("[data-pill]"));
    if (!buttons.length) return;
    const next = (fromIndex + delta + buttons.length) % buttons.length;
    setRovingTab(next);
    buttons[next]?.focus();
  };

  const pillKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, opt: PillOption) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(index, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(index, -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(opt.value);
    }
  };

  const singleTabIndex = (opt: PillOption, index: number) => {
    if (multi) return 0;
    if (value === opt.value) return 0;
    if (index === 0 && !options.some((o) => o.value === value)) return 0;
    return -1;
  };

  const activeRing = a
    ? "border-purple-500/45 bg-purple-500/10 text-text-primary ring-1 ring-purple-500/20"
    : "border-emerald-500/45 bg-emerald-500/10 text-text-primary ring-1 ring-emerald-500/20";

  const inactiveCard = cn(
    "flex-1 min-w-[5.5rem] rounded-lg border px-3 py-2 text-center text-sm transition-all",
    "border-white/[0.08] bg-black/20 text-text-tertiary min-h-[44px] sm:min-h-0",
    a ? "hover:border-purple-500/30 hover:text-text-secondary" : "hover:border-emerald-500/30 hover:text-text-secondary"
  );

  const inactivePill = cn(
    "rounded-full border px-3 py-2 text-xs transition-all sm:py-1.5",
    "border-white/[0.08] bg-black/15 text-text-secondary min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
    a ? "hover:border-purple-500/30 hover:text-text-primary" : "hover:border-emerald-500/30 hover:text-text-primary"
  );

  if (variant === "card") {
    return (
      <div
        ref={rootRef}
        role={multi ? "group" : "radiogroup"}
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-2", className)}
      >
        {options.map((opt, index) => (
          <button
            key={opt.value}
            type="button"
            data-pill
            role={multi ? "checkbox" : "radio"}
            aria-checked={isActive(opt.value)}
            tabIndex={singleTabIndex(opt, index)}
            onFocus={() => setRovingTab(index)}
            onKeyDown={(e) => pillKeyDown(e, index, opt)}
            onClick={() => handleClick(opt.value)}
            className={cn("pill", inactiveCard, isActive(opt.value) && activeRing)}
          >
            <div
              className={cn(
                "text-xs font-medium",
                isActive(opt.value) ? (a ? "text-purple-200" : "text-emerald-200") : "text-text-primary"
              )}
            >
              {opt.label}
            </div>
            {opt.sub ? (
              <div
                className={cn(
                  "mt-0.5 text-[10px]",
                  isActive(opt.value) ? (a ? "text-purple-200/80" : "text-emerald-200/80") : "text-text-tertiary"
                )}
              >
                {opt.sub}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {options.map((opt, index) => (
        <button
          key={opt.value}
          type="button"
          data-pill
          role={multi ? "checkbox" : "radio"}
          aria-checked={isActive(opt.value)}
          tabIndex={singleTabIndex(opt, index)}
          onFocus={() => setRovingTab(index)}
          onKeyDown={(e) => pillKeyDown(e, index, opt)}
          onClick={() => handleClick(opt.value)}
          className={cn(
            "pill",
            inactivePill,
            isActive(opt.value) &&
              (a
                ? "border-purple-500/45 bg-purple-500/10 font-medium text-purple-100 ring-1 ring-purple-500/15"
                : "border-emerald-500/45 bg-emerald-500/10 font-medium text-emerald-100 ring-1 ring-emerald-500/15")
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
