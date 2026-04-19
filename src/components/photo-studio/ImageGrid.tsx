"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { ImageCard, type LibraryJob } from "@/components/photo-studio/ImageCard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ImageGrid({ refreshKey = 0 }: { refreshKey?: number }) {
  const [jobs, setJobs] = React.useState<LibraryJob[]>([]);
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
        const list = (json as { jobs: LibraryJob[] }).jobs;
        setJobs(list);
      } catch {
        toast.error("Could not load library");
      }
    }
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const now = Date.now();
  const filtered = jobs.filter((j) => {
    const completed = j.completedAt ? new Date(j.completedAt).getTime() : new Date(j.createdAt).getTime();
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
      if (!j.id.toLowerCase().includes(q) && !j.originalUrl.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "today" as const, label: "Today" },
    { id: "week" as const, label: "This week" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Library</h2>
          <p className="text-[11px] text-text-tertiary">{jobs.length} saved generations</p>
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
          {jobs.length === 0 ? "No generations yet." : "No results match your filter."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((j) => (
            <ImageCard
              key={j.id}
              job={j}
              onDeleted={(id) => setJobs((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
