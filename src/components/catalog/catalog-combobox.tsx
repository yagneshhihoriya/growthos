"use client";

import * as React from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogProductRow = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  colors: string[];
};

type Props = {
  valueId: string | null | undefined;
  onSelect: (p: CatalogProductRow | null) => void;
  accent?: "emerald" | "purple";
  label?: string;
  className?: string;
};

const DEBOUNCE_MS = 280;

export function CatalogCombobox({
  valueId,
  onSelect,
  accent = "emerald",
  label = "Link catalog product",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<CatalogProductRow[]>([]);
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const purple = accent === "purple";

  const selected = valueId ? items.find((x) => x.id === valueId) : undefined;

  const fetchList = React.useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { products?: CatalogProductRow[] };
      setItems(json.products ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!valueId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/catalog/search?id=${encodeURIComponent(valueId)}`);
        const json = (await res.json()) as { products?: CatalogProductRow[] };
        const row = json.products?.[0];
        if (row) setItems((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev]));
      } catch {
        /* ignore */
      }
    })();
  }, [valueId]);

  React.useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchList(query.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, fetchList]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const applyPick = (p: CatalogProductRow | null) => {
    onSelect(p);
    setOpen(false);
    setQuery("");
    if (p) setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
  };

  const list = items;
  const safeHighlight = list.length ? Math.min(highlight, list.length - 1) : 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
        {label}{" "}
        <span className="font-normal text-text-tertiary/60">(optional)</span>
      </label>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            void fetchList("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-colors",
          "border-border-default bg-bg-surface text-text-primary",
          purple ? "focus:border-purple-500/35 focus:ring-1 focus:ring-purple-500/20" : "focus:border-emerald-500/35 focus:ring-1 focus:ring-emerald-500/20"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-text-tertiary")}>
          {selected ? selected.name : "— Search or pick a product —"}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-tertiary", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute z-40 mt-1 max-h-72 w-full overflow-hidden rounded-md border border-border-default bg-bg-elevated shadow-lg"
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
                  setHighlight((h) => (list.length ? (h + 1) % list.length : 0));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => (list.length ? (h - 1 + list.length) % list.length : 0));
                } else if (e.key === "Enter" && list[safeHighlight]) {
                  e.preventDefault();
                  applyPick(list[safeHighlight]!);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
              placeholder="Type name or category…"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              aria-label="Search catalog"
            />
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-tertiary" /> : null}
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {valueId && selected ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-text-tertiary hover:bg-white/[0.04]"
                onClick={() => applyPick(null)}
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Clear selection
              </button>
            ) : null}
            {list.length === 0 && !loading ? (
              <p className="px-3 py-4 text-center text-xs text-text-tertiary">No matches.</p>
            ) : (
              list.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={p.id === valueId}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                    i === safeHighlight ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => applyPick(p)}
                >
                  <span className="font-medium text-text-primary">{p.name}</span>
                  <span className="text-[11px] text-text-tertiary">
                    {[p.category, p.price != null ? `₹${p.price}` : null].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
