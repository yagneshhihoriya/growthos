"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  type ProductCategory,
} from "@/types/photo-studio";
import { cn } from "@/lib/utils";

type Props = {
  value: ProductCategory;
  onChange: (value: ProductCategory) => void;
  id?: string;
  placeholder?: string;
};

/**
 * Searchable, grouped product-category combobox used in Photo Studio multi-image
 * generation. Matches the dark-surface visual language of the surrounding panel.
 */
export function CategoryCombobox({
  value,
  onChange,
  id,
  placeholder = "Select product category…",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_GROUPS.map((group) => ({
      ...group,
      categories: q
        ? group.categories.filter((cat) =>
            CATEGORY_LABELS[cat].toLowerCase().includes(q)
          )
        : group.categories,
    })).filter((group) => group.categories.length > 0);
  }, [query]);

  const flatItems = React.useMemo(
    () => filteredGroups.flatMap((g) => g.categories),
    [filteredGroups]
  );
  const safeHighlight = flatItems.length
    ? Math.min(highlight, flatItems.length - 1)
    : 0;

  const pick = (cat: ProductCategory) => {
    onChange(cat);
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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm transition-colors",
          "border-white/[0.08] bg-white/[0.03] text-text-primary focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20 sm:min-h-[42px]"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-text-tertiary")}>
          {value ? CATEGORY_LABELS[value] : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-white/[0.08] bg-bg-elevated shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
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
                  setHighlight((h) =>
                    flatItems.length ? (h + 1) % flatItems.length : 0
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) =>
                    flatItems.length
                      ? (h - 1 + flatItems.length) % flatItems.length
                      : 0
                  );
                } else if (e.key === "Enter" && flatItems[safeHighlight]) {
                  e.preventDefault();
                  pick(flatItems[safeHighlight]!);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Search categories…"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              aria-label="Search categories"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filteredGroups.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-tertiary">
                No categories found{query ? ` for "${query}"` : ""}
              </p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="sticky top-0 bg-bg-elevated px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary/70">
                    {group.label}
                  </p>
                  {group.categories.map((cat) => {
                    const flatIdx = flatItems.indexOf(cat);
                    const isSelected = value === cat;
                    const isHighlight = flatIdx === safeHighlight;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlight(flatIdx)}
                        onClick={() => pick(cat)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                          isHighlight ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                          isSelected && "text-purple-200"
                        )}
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            isSelected && "font-medium"
                          )}
                        >
                          {CATEGORY_LABELS[cat]}
                        </span>
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-purple-300" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
