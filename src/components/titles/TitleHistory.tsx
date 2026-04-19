"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Copy, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { PlatformKey } from "@/lib/title-pipeline";

type OptimizationRow = {
  id: string;
  productId: string | null;
  originalTitle: string | null;
  version: number;
  optimizedScore: number | null;
  isApplied: boolean;
  createdAt: string;
  optimizedTitles: Record<string, string> | null;
  product: { name: string; rawImageUrls: string[] } | null;
};

const PLATFORM_ORDER: PlatformKey[] = ["amazon", "flipkart", "meesho", "instagram"];

export function TitleHistory({
  onStartAbTest,
}: {
  /** Parent should bump `key` on this component after a new optimization so the list refetches. */
  onStartAbTest?: (row: OptimizationRow) => void;
}) {
  const toast = useToast();
  const [rows, setRows] = React.useState<OptimizationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/titles?page=${page}`);
      const json = (await res.json()) as {
        optimizations?: OptimizationRow[];
        pages?: number;
      };
      setRows(json.optimizations ?? []);
      setTotalPages(Math.max(1, json.pages ?? 1));
    } catch {
      toast.error("Could not load history");
    } finally {
      setLoading(false);
    }
  }, [toast, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, OptimizationRow[]>();
    for (const r of rows) {
      const key = r.productId ?? `__none__:${r.id}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    for (const list of Array.from(map.values())) {
      list.sort((a: OptimizationRow, b: OptimizationRow) => b.version - a.version);
    }
    return map;
  }, [rows]);

  async function copyTitles(titles: Record<string, string> | null) {
    if (!titles) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(titles, null, 2));
      toast.success("Copied", "All platform titles copied as JSON.");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function restoreVersion(v: OptimizationRow) {
    const t = v.optimizedTitles;
    if (!t) {
      toast.warning("Nothing to copy", "This version has no titles.");
      return;
    }
    const lines = PLATFORM_ORDER.map((p) => {
        const s = t[p];
        return typeof s === "string" && s.trim() ? `${p.toUpperCase()}: ${s.trim()}` : null;
    }).filter(Boolean);
    const text = lines.join("\n\n");
    if (!text) {
      toast.warning("Nothing to copy", "No platform titles on this version.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Restored to clipboard", "Paste into your listing tools or notes.");
    } catch {
      toast.error("Copy failed");
    }
  }

  if (loading) {
    return <p className="text-sm text-text-tertiary">Loading…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-text-tertiary">No optimizations yet. Run one from the Single product tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          <span className="text-text-tertiary">
            Page {page} of {totalPages}
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      {Array.from(grouped.entries()).map(([groupKey, versions]: [string, OptimizationRow[]]) => {
        const head = versions[0];
        const title =
          head.product?.name ??
          (head.productId ? "Product" : "Ad-hoc optimization");
        const thumb = head.product?.rawImageUrls?.[0];

        return (
          <div key={groupKey} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex gap-3">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-white/[0.08]" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] text-text-tertiary">
                  No img
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text-primary">{title}</p>
                <p className="text-[11px] text-text-tertiary">
                  {versions.length} version{versions.length === 1 ? "" : "s"}
                  {head.productId ? "" : " · not linked to a catalog product"}
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
              {versions.map((v) => {
                const meesho = v.optimizedTitles && typeof v.optimizedTitles.meesho === "string" ? v.optimizedTitles.meesho : "";
                return (
                  <li key={v.id} className="rounded-lg bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-text-primary">v{v.version}</span>
                        {v.optimizedScore != null ? (
                          <span className="text-text-tertiary">Score {v.optimizedScore}/100</span>
                        ) : null}
                        {v.isApplied ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            Applied
                          </span>
                        ) : null}
                        <span className="text-text-tertiary">
                          {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => void copyTitles(v.optimizedTitles)}>
                          <Copy className="h-3.5 w-3.5" />
                          Copy JSON
                        </Button>
                        <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => void restoreVersion(v)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore this version
                        </Button>
                        {onStartAbTest ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => onStartAbTest(v)}
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                            A/B test
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-text-tertiary"
                          onClick={() => setExpandedId((id) => (id === v.id ? null : v.id))}
                        >
                          {expandedId === v.id ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              Hide full
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              View full
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {meesho && expandedId !== v.id ? (
                      <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{meesho}</p>
                    ) : null}
                    {expandedId === v.id ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs text-text-secondary">
                        {PLATFORM_ORDER.map((p) => {
                          const t = v.optimizedTitles?.[p];
                          if (!t || typeof t !== "string") return null;
                          return (
                            <div key={p}>
                              <span className="font-semibold uppercase text-text-tertiary">{p}</span>
                              <p className="mt-1 whitespace-pre-wrap text-text-primary">{t}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {PLATFORM_ORDER.map((p) => {
                        const t = v.optimizedTitles?.[p];
                        if (!t || typeof t !== "string") return null;
                        return (
                          <button
                            key={p}
                            type="button"
                            className="min-h-[44px] rounded border border-white/[0.08] px-2 py-1.5 text-[10px] text-purple-300 hover:bg-purple-500/10 sm:min-h-0"
                            onClick={() => void navigator.clipboard.writeText(t).then(() => toast.success("Copied", p))}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
