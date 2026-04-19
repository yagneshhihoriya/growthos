"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG, type TitlePlatform } from "@/types/title-optimizer";

const PLATFORM_ORDER = Object.keys(PLATFORM_CONFIG) as TitlePlatform[];

interface PlatformSelectorProps {
  value: TitlePlatform[];
  onChange: (platforms: TitlePlatform[]) => void;
  error?: string;
}

export function PlatformSelector({ value, onChange, error }: PlatformSelectorProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  const setRovingTab = (focusedIndex: number) => {
    const el = rootRef.current;
    if (!el) return;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("[data-plat]"));
    buttons.forEach((btn, i) => {
      btn.tabIndex = i === focusedIndex ? 0 : -1;
    });
  };

  const toggle = (p: TitlePlatform) => {
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  };

  const rovingTabIndex = (key: TitlePlatform, index: number) => {
    if (value.length === 0) return index === 0 ? 0 : -1;
    const firstSelected = PLATFORM_ORDER.findIndex((k) => value.includes(k));
    return index === firstSelected ? 0 : -1;
  };

  const moveFocus = (fromIndex: number, delta: number) => {
    const el = rootRef.current;
    if (!el) return;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>("[data-plat]"));
    if (!buttons.length) return;
    const next = (fromIndex + delta + buttons.length) % buttons.length;
    setRovingTab(next);
    buttons[next]?.focus();
  };

  const cardKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, key: TitlePlatform) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(index, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(index, -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(key);
    }
  };

  return (
    <div>
      <div
        ref={rootRef}
        role="group"
        aria-label="Target marketplaces"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {PLATFORM_ORDER.map((key, index) => {
          const config = PLATFORM_CONFIG[key];
          const active = value.includes(key);
          return (
            <button
              key={key}
              type="button"
              data-plat
              role="checkbox"
              aria-checked={active}
              aria-label={`${config.label} — ${config.limitLabel}`}
              tabIndex={rovingTabIndex(key, index)}
              onFocus={() => setRovingTab(index)}
              onKeyDown={(e) => cardKeyDown(e, index, key)}
              onClick={() => toggle(key)}
              className={cn(
                "plat flex min-h-[44px] flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-all sm:min-h-0 sm:px-2",
                "border-white/[0.08] bg-black/20",
                "hover:border-purple-500/35",
                active && "border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/20"
              )}
            >
              <span className={cn("text-xs font-medium", active ? "text-purple-100" : "text-text-primary")}>
                {config.label}
              </span>
              <span className={cn("mt-0.5 text-[10px]", active ? "text-purple-200/80" : "text-text-tertiary")}>
                {config.limitLabel}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
