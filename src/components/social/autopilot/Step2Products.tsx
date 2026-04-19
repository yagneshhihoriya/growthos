"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  price: number | null;
  rawImageUrls: string[];
  category: string | null;
};

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  language: "hinglish" | "hindi" | "english";
  onLanguageChange: (l: "hinglish" | "hindi" | "english") => void;
  onBack: () => void;
  onNext: () => void;
};

export function AutopilotStep2Products({
  selectedIds,
  onChange,
  language,
  onLanguageChange,
  onBack,
  onNext,
}: Props) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/products")
      .then((r) => r.json() as Promise<{ products?: Product[]; error?: string }>)
      .then((j) => {
        if (!alive) return;
        if (j.error) throw new Error(j.error);
        setProducts(j.products ?? []);
      })
      .catch(() => toast.error("Could not load products"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 10) {
        toast.warning("Maximum 10 products");
        return;
      }
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Which products should feature?</h2>
        <p className="mt-1 text-sm text-text-tertiary">
          AI will rotate through these products across 30 days. Pick 1&ndash;10.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Language</p>
        <div className="flex flex-wrap gap-2">
          {(["hinglish", "hindi", "english"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLanguageChange(l)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                language === l
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                  : "border-white/[0.08] text-text-secondary"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-text-tertiary">
          You haven&rsquo;t added any products yet. Add a product first, then come back here.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const selected = selectedIds.includes(p.id);
            const thumb = p.rawImageUrls?.[0];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border text-left transition-colors",
                  selected
                    ? "border-purple-500/40 ring-1 ring-purple-500/40"
                    : "border-white/[0.08] hover:border-white/[0.16]"
                )}
              >
                <div className="aspect-square bg-white/[0.04]">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm text-text-primary">{p.name}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {p.category ?? "—"} · {p.price ? `₹${p.price}` : "—"}
                  </p>
                </div>
                {selected ? (
                  <span className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button type="button" onClick={onNext} disabled={selectedIds.length === 0}>
          Generate calendar →
        </Button>
      </div>
    </div>
  );
}
