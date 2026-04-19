"use client";

import * as React from "react";
import Link from "next/link";
import { ImageIcon, Loader2, Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { cn } from "@/lib/utils";

/** Product fields we prefill into the AI caption form. */
export type CaptionPrefill = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  colors: string[];
  sizes: string[];
  fabric: string | null;
  occasion: string[];
};

type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  colors: string[];
  sizes: string[];
  fabric: string | null;
  occasion: string[];
};

type LibraryJob = {
  id: string;
  productId: string | null;
  originalUrl: string;
  processedUrls: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
  product: { id: string; name: string } | null;
};

type LibraryResponse = { jobs: LibraryJob[]; nextCursor: string | null };

/** Shared fallback chain — `generated` is what /api/images/generate writes today,
 *  the others are legacy / platform-specific keys we still respect. */
function pickImageUrl(job: LibraryJob): string | null {
  const raw = (job.processedUrls ?? {}) as Record<string, unknown>;
  const candidates = [raw.generated, raw.instagram, raw.amazon, ...Object.values(raw)];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Tab = "studio" | "catalog" | "upload";

export function ImagePickerTabs({
  selected,
  onPick,
  onPrefill,
}: {
  selected: string;
  onPick: (url: string) => void;
  onPrefill?: (p: CaptionPrefill) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("studio");

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
        Image
      </p>
      <div className="mt-3 flex gap-2">
        <TabButton active={tab === "studio"} onClick={() => setTab("studio")} icon={<ImageIcon className="h-3.5 w-3.5" />}>
          From Photo Studio
        </TabButton>
        <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")} icon={<Package className="h-3.5 w-3.5" />}>
          From Product Catalog
        </TabButton>
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={<Upload className="h-3.5 w-3.5" />}>
          Upload New
        </TabButton>
      </div>

      <div className="mt-4">
        {tab === "studio" ? (
          <StudioTab selected={selected} onPick={onPick} />
        ) : tab === "catalog" ? (
          <CatalogTab selected={selected} onPick={onPick} onPrefill={onPrefill} onMissing={(msg) => toast.warning(msg)} />
        ) : (
          <UploadTab selected={selected} onPick={onPick} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
          : "border-white/[0.08] bg-white/[0.02] text-text-secondary hover:border-white/[0.15]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** ===================== Layer 1 ===================== */

function StudioTab({ selected, onPick }: { selected: string; onPick: (url: string) => void }) {
  const [jobs, setJobs] = React.useState<LibraryJob[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [initialLoaded, setInitialLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPage = React.useCallback(async (nextCursor: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ take: "20" });
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/images/library?${params.toString()}`);
      const json = (await res.json()) as LibraryResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load library");
      setJobs((prev) => (nextCursor ? [...prev, ...json.jobs] : json.jobs));
      setCursor(json.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load library");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    void loadPage(null);
  }, [loadPage]);

  if (!initialLoaded && loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your Photo Studio images…
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-red-300">{error}</p>;
  }

  if (!jobs.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/[0.12] p-6 text-center">
        <p className="text-sm text-text-secondary">No processed images yet.</p>
        <Link
          href="/photo-studio"
          className="mt-2 inline-flex text-xs font-medium text-purple-300 hover:text-purple-200"
        >
          Process your first image in Photo Studio →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {jobs.map((j) => {
          const url = pickImageUrl(j);
          if (!url) return null;
          const isSelected = selected === url;
          return (
            <button
              key={j.id}
              type="button"
              onClick={() => onPick(url)}
              className={cn(
                "group relative overflow-hidden rounded-lg border bg-black/30 text-left transition-colors",
                isSelected
                  ? "border-amber-400/80 ring-2 ring-amber-400/40"
                  : "border-white/[0.08] hover:border-white/[0.2]"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={j.product?.name ?? "Processed image"}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-text-primary">
                  {j.product?.name ?? "Untitled"}
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {formatDate(j.completedAt ?? j.createdAt)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {cursor ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void loadPage(cursor)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** ===================== Layer 2 ===================== */

function CatalogTab({
  selected,
  onPick,
  onPrefill,
  onMissing,
}: {
  selected: string;
  onPick: (url: string) => void;
  onPrefill?: (p: CaptionPrefill) => void;
  onMissing: (msg: string) => void;
}) {
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [productId, setProductId] = React.useState("");
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [lookupState, setLookupState] = React.useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "missing"; productId: string }
    | { kind: "found"; url: string; productName: string }
  >({ kind: "idle" });

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products");
        const json = (await res.json()) as { products?: ProductRow[] };
        setProducts(json.products ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  async function handleSelect(id: string) {
    setProductId(id);
    if (!id) {
      setLookupState({ kind: "idle" });
      return;
    }
    const product = products.find((p) => p.id === id);
    if (product && onPrefill) {
      onPrefill({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        colors: Array.isArray(product.colors) ? product.colors : [],
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        fabric: product.fabric,
        occasion: Array.isArray(product.occasion) ? product.occasion : [],
      });
    }

    setLookupState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/images/library?productId=${encodeURIComponent(id)}&take=1`
      );
      const json = (await res.json()) as LibraryResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to look up images");
      const job = json.jobs[0];
      const url = job ? pickImageUrl(job) : null;
      if (!url) {
        setLookupState({ kind: "missing", productId: id });
        return;
      }
      setLookupState({ kind: "found", url, productName: product?.name ?? "Product" });
      onPick(url);
    } catch (e) {
      onMissing(e instanceof Error ? e.message : "Lookup failed");
      setLookupState({ kind: "idle" });
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-tertiary">Choose a product</label>
        <select
          className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm text-text-primary"
          value={productId}
          onChange={(e) => void handleSelect(e.target.value)}
          disabled={loadingProducts}
        >
          <option value="">{loadingProducts ? "Loading products…" : "— Select a product —"}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {lookupState.kind === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking up processed image…
        </div>
      ) : null}

      {lookupState.kind === "missing" ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          No processed image for this product yet.{" "}
          <Link
            href={`/photo-studio?productId=${encodeURIComponent(lookupState.productId)}`}
            className="font-medium underline hover:text-amber-100"
          >
            Process this product in Photo Studio first →
          </Link>
        </div>
      ) : null}

      {lookupState.kind === "found" && selected === lookupState.url ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lookupState.url}
            alt={lookupState.productName}
            className="h-16 w-16 rounded object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{lookupState.productName}</p>
            <p className="text-[11px] text-text-tertiary">Auto-selected from latest processed image</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** ===================== Layer 3 ===================== */

function UploadTab({ selected, onPick }: { selected: string; onPick: (url: string) => void }) {
  const upload = useImageUpload();

  async function uploadAndPick() {
    if (!upload.files.length) {
      toast.warning("Choose a file first");
      return;
    }
    const urls = await upload.uploadAll();
    const first = urls[0];
    if (first) onPick(first);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs text-amber-200/90">
        <span className="font-semibold">Want a better result?</span>{" "}
        <Link href="/photo-studio" className="underline hover:text-amber-100">
          Process this in Photo Studio first →
        </Link>{" "}
        — cleaner background, consistent lighting, better CTR.
      </div>

      <div className="rounded-lg border border-dashed border-white/[0.12] p-4 text-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="social-upload"
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) upload.addFiles(Array.from(list));
            e.target.value = "";
          }}
        />
        <label htmlFor="social-upload" className="cursor-pointer text-sm text-purple-400 hover:text-purple-300">
          Choose file
        </label>
        <p className="mt-1 text-[11px] text-text-tertiary">JPG, PNG, WEBP · max 25MB</p>
        {upload.files.map((f) => (
          <div key={f.id} className="mt-2 text-xs text-text-secondary">
            {f.name} — {f.status} {f.publicUrl ? "✓" : ""}
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => void uploadAndPick()}
          disabled={upload.isUploading || !upload.files.length}
        >
          {upload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload to storage"}
        </Button>
      </div>

      {upload.files.find((f) => f.publicUrl && f.publicUrl === selected) ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected}
            alt="Uploaded"
            className="h-16 w-16 rounded object-cover"
          />
          <p className="truncate text-sm text-text-primary">Uploaded and selected</p>
        </div>
      ) : null}
    </div>
  );
}
