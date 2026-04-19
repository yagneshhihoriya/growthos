"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { ImageCard } from "@/components/photo-studio/ImageCard";
import { BatchCard } from "@/components/photo-studio/BatchCard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { LibraryItem } from "@/types/library";

/**
 * Photo Studio library grid.
 * Renders single generations as individual tiles and multi-image batches
 * as a single "set" tile that opens a modal with all styles inside.
 */
export function ImageGrid({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [filter, setFilter] = React.useState<"all" | "today" | "week">("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/images/library");
        const json: unknown = await res.json();
        if (!res.ok) throw new Error("Failed to load library");
        if (cancelled) return;
        const list = (json as { items: LibraryItem[] }).items ?? [];
        setItems(list);
      } catch {
        toast.error("Could not load library");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const now = Date.now();
  const filtered = items.filter((item) => {
    const completedIso =
      item.kind === "single"
        ? item.job.completedAt ?? item.job.createdAt
        : item.completedAt ?? item.createdAt;
    const completed = new Date(completedIso).getTime();

    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      if (completed < start.getTime()) return false;
    }
    if (filter === "week") {
      if (now - completed > 7 * 24 * 60 * 60 * 1000) return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      if (item.kind === "single") {
        if (
          !item.job.id.toLowerCase().includes(q) &&
          !item.job.originalUrl.toLowerCase().includes(q) &&
          !(item.job.product?.name ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      } else {
        if (
          !item.batchId.toLowerCase().includes(q) &&
          !item.originalUrl.toLowerCase().includes(q) &&
          !(item.product?.name ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
    }
    return true;
  });

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "today" as const, label: "Today" },
    { id: "week" as const, label: "This week" },
  ];

  const totalImages = items.reduce(
    (acc, item) => acc + (item.kind === "single" ? 1 : item.totalImages),
    0
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Library</h2>
          <p className="text-[11px] text-text-tertiary">
            {items.length} {items.length === 1 ? "entry" : "entries"}
            {totalImages !== items.length ? ` · ${totalImages} images` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  filter === f.id
                    ? "bg-white/[0.06] text-text-primary"
                    : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-40 rounded-lg border border-white/[0.06] bg-white/[0.02] pl-8 pr-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-white/[0.12] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-sm text-text-tertiary">
          {items.length === 0 ? "No generations yet." : "No results match your filter."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) =>
            item.kind === "single" ? (
              <ImageCard
                key={`s-${item.job.id}`}
                job={item.job}
                onDeleted={(id) =>
                  setItems((prev) =>
                    prev.filter((x) => !(x.kind === "single" && x.job.id === id))
                  )
                }
              />
            ) : (
              <BatchCard
                key={`b-${item.batchId}`}
                item={item}
                onDeleted={(batchId) =>
                  setItems((prev) =>
                    prev.filter((x) => !(x.kind === "batch" && x.batchId === batchId))
                  )
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
