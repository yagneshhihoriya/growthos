"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Download, Layers, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DeleteGenerationConfirmDialog } from "@/components/photo-studio/DeleteGenerationConfirmDialog";
import { toast } from "@/lib/toast";
import { downloadAllImages, downloadSingleImage } from "@/lib/download-images";
import { IMAGE_STYLE_CONFIG, type ImageStyle } from "@/types/photo-studio";
import type { LibraryBatchItem } from "@/types/library";

function styleLabel(key: string | null): string {
  if (!key) return "Generated";
  const cfg = (IMAGE_STYLE_CONFIG as Record<string, { label?: string }>)[key];
  return cfg?.label ?? key.replace(/_/g, " ");
}

function toImageStyleOrGeneric(key: string | null): ImageStyle {
  if (key && key in IMAGE_STYLE_CONFIG) return key as ImageStyle;
  // Fallback so downloadSingleImage still produces a sensible filename.
  return "white_bg";
}

export function BatchDetailModal({
  open,
  onOpenChange,
  item,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LibraryBatchItem;
  onDeleted?: (batchId: string) => void;
}) {
  const [downloadingAll, setDownloadingAll] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const completed = item.styles.filter(
    (s): s is typeof s & { imageUrl: string } => !!s.imageUrl
  );

  const handleDownloadAll = React.useCallback(async () => {
    if (!completed.length) {
      toast.error("Nothing to download yet");
      return;
    }
    setDownloadingAll(true);
    try {
      await downloadAllImages(
        completed.map((s) => ({
          style: toImageStyleOrGeneric(s.style),
          imageUrl: s.imageUrl,
        })),
        item.product?.name ?? "product"
      );
      toast.success(`Downloaded ${completed.length} images`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingAll(false);
    }
  }, [completed, item.product?.name]);

  const handleDownloadOne = React.useCallback(
    async (imageUrl: string, style: string | null) => {
      try {
        await downloadSingleImage(imageUrl, toImageStyleOrGeneric(style));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Download failed");
      }
    },
    []
  );

  const handleDeleteSet = React.useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/images/library/batch/${item.batchId}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      toast.success("Set deleted", {
        description: `Removed ${item.totalImages} images from your library.`,
      });
      setDeleteOpen(false);
      onDeleted?.(item.batchId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [item.batchId, item.totalImages, onDeleted]);

  const whenLabel = item.completedAt
    ? formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })
    : "—";

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
        <DialogContent
          className="inset-4 left-4 top-4 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-2xl border-white/[0.08] bg-bg-surface p-0 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-text-tertiary" />
                <h2 className="truncate text-sm font-semibold text-text-primary">
                  {item.product?.name ? `${item.product.name} · ` : ""}Set of {item.totalImages} images
                </h2>
              </div>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                Generated {whenLabel} · {completed.length} of {item.totalImages} ready
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadAll()}
                disabled={downloadingAll || !completed.length}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-[12px] font-medium text-text-primary transition-colors hover:border-white/[0.18] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {downloadingAll ? "Zipping…" : "Download all"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={deleting}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-3 text-[12px] font-medium text-red-200 transition-colors hover:border-red-500/40 hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete set
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="grid h-[calc(100%-57px)] grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[260px_1fr]">
            {/* Original image */}
            <aside className="hidden border-r border-white/[0.06] bg-white/[0.02] p-4 lg:block">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Source photo
              </p>
              <div className="overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.originalUrl}
                  alt="Original upload"
                  className="aspect-square w-full object-cover"
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
                All images in this set were generated from this upload.
              </p>
            </aside>

            {/* Styles grid */}
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {item.styles.map((s) => (
                  <div
                    key={s.jobId}
                    className="group relative overflow-hidden rounded-lg ring-1 ring-white/[0.08]"
                  >
                    {s.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imageUrl}
                          alt={styleLabel(s.style)}
                          className="aspect-square w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 transition-transform duration-200 group-hover:translate-y-0">
                          <button
                            type="button"
                            onClick={() => void handleDownloadOne(s.imageUrl!, s.style)}
                            className="flex h-7 items-center gap-1.5 rounded-md bg-white/15 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const href = s.imageUrl!.startsWith("/")
                                ? `${window.location.origin}${s.imageUrl}`
                                : s.imageUrl!;
                              window.open(href, "_blank", "noopener,noreferrer");
                            }}
                            className="flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                          >
                            Open
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-black/30 text-[11px] text-text-tertiary">
                        Not generated
                      </div>
                    )}
                    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
                      {styleLabel(s.style)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteGenerationConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={deleting}
        onConfirm={handleDeleteSet}
        title={`Delete this set of ${item.totalImages} images?`}
        description="Permanently removes every image in this set from your library and storage."
        confirmLabel="Delete set"
      />
    </>
  );
}
