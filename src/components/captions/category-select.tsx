"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPER_CATEGORY_LABELS,
  SUPER_CATEGORY_ORDER,
  allCategoryOptions,
} from "@/lib/title-optimizer-categories";
import type { SuperCategory } from "@/lib/title-pipeline";

const OPTIONS = allCategoryOptions();

type Props = {
  value: string;
  onChange: (label: string, superCategory: SuperCategory | null) => void;
  error?: string;
  id?: string;
  placeholder?: string;
};

/** Searchable, grouped category dropdown for the AI Captions form. */
export function CaptionCategorySelect({
  value,
  onChange,
  error,
  id,
  placeholder = "Select or search category…",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? OPTIONS.filter((o) => o.label.toLowerCase().includes(q)) : OPTIONS;
    const byGroup = new Map<SuperCategory, string[]>();
    for (const o of matches) {
      const list = byGroup.get(o.group) ?? [];
      list.push(o.label);
      byGroup.set(o.group, list);
    }
    return SUPER_CATEGORY_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      label: SUPER_CATEGORY_LABELS[g],
      items: byGroup.get(g) ?? [],
    }));
  }, [query]);

  const flatItems = React.useMemo(
    () => grouped.flatMap((g) => g.items.map((label) => ({ label, group: g.group }))),
    [grouped]
  );
  const safeHighlight = flatItems.length ? Math.min(highlight, flatItems.length - 1) : 0;

  const applyPick = (label: string, group: SuperCategory) => {
    onChange(label, group);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-colors",
          "bg-bg-surface text-text-primary focus:outline-none focus:ring-1",
          error ? "border-red-500/50" : "border-border-default",
          "focus:border-purple-500/35 focus:ring-purple-500/20 sm:min-h-9"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-text-tertiary")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-text-tertiary transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-hidden rounded-md border border-border-default bg-bg-elevated shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-2 py-2">
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => (flatItems.length ? (h + 1) % flatItems.length : 0));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) =>
                    flatItems.length ? (h - 1 + flatItems.length) % flatItems.length : 0
                  );
                } else if (e.key === "Enter" && flatItems[safeHighlight]) {
                  e.preventDefault();
                  const pick = flatItems[safeHighlight]!;
                  applyPick(pick.label, pick.group);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Type to search (Kurti, AC, Face Cream…)"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              aria-label="Search categories"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {grouped.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-tertiary">No categories found</p>
            ) : (
              grouped.map((grp) => (
                <div key={grp.group}>
                  <p className="sticky top-0 bg-bg-elevated px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary/70">
                    {grp.label}
                  </p>
                  {grp.items.map((lbl) => {
                    const flatIdx = flatItems.findIndex((x) => x.label === lbl && x.group === grp.group);
                    const isSelected = value === lbl;
                    const isHighlight = flatIdx === safeHighlight;
                    return (
                      <button
                        key={`${grp.group}-${lbl}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlight(flatIdx)}
                        onClick={() => applyPick(lbl, grp.group)}
                        className={cn(
                          "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors",
                          isHighlight ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                          isSelected && "text-purple-200"
                        )}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
