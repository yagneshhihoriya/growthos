"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Layers, Trash2 } from "lucide-react";
import { DeleteGenerationConfirmDialog } from "@/components/photo-studio/DeleteGenerationConfirmDialog";
import { BatchDetailModal } from "@/components/photo-studio/BatchDetailModal";
import { toast } from "@/lib/toast";
import type { LibraryBatchItem } from "@/types/library";

/**
 * Single tile that represents a whole multi-image batch.
 * Visual: hero thumbnail of the first completed style, with two offset cards
 * behind it for a "stack" effect + "N styles" pill in the corner.
 */
export function BatchCard({
  item,
  onDeleted,
}: {
  item: LibraryBatchItem;
  onDeleted?: (batchId: string) => void;
}) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const hero = React.useMemo(
    () => item.styles.find((s) => !!s.imageUrl)?.imageUrl ?? item.originalUrl,
    [item.styles, item.originalUrl]
  );

  const runDelete = React.useCallback(async () => {
    const res = await fetch(`/api/images/library/batch/${item.batchId}`, {
      method: "DELETE",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Delete failed");
    onDeleted?.(item.batchId);
  }, [item.batchId, onDeleted]);

  const confirmDelete = React.useCallback(async () => {
    setDeleting(true);
    try {
      await runDelete();
      toast.success("Set deleted", {
        description: `Removed ${item.totalImages} images from your library.`,
      });
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [runDelete, item.totalImages]);

  const whenLabel = item.completedAt
    ? formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })
    : "—";

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="group relative block aspect-square w-full text-left focus:outline-none"
        aria-label={`Open set of ${item.totalImages} images`}
      >
        {/* Stacked background layers for the "multiple images" depth cue. */}
        <span
          aria-hidden
          className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[2deg] rounded-lg bg-white/[0.04] ring-1 ring-white/[0.05] transition-transform duration-200 group-hover:translate-x-2.5 group-hover:translate-y-2.5"
        />
        <span
          aria-hidden
          className="absolute inset-0 translate-x-0.5 translate-y-0.5 rotate-[-1deg] rounded-lg bg-white/[0.06] ring-1 ring-white/[0.07] transition-transform duration-200 group-hover:translate-x-1.5 group-hover:translate-y-1.5"
        />

        <span className="absolute inset-0 overflow-hidden rounded-lg ring-1 ring-white/[0.08] transition-shadow duration-200 group-hover:ring-white/[0.16]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={`Batch of ${item.totalImages} product images`}
            className="h-full w-full object-cover"
          />

          {/* Corner "N styles" pill */}
          <span className="pointer-events-none absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Layers className="h-3 w-3" />
            {item.totalImages} {item.totalImages === 1 ? "style" : "styles"}
          </span>

          {/* Timestamp */}
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70 backdrop-blur-sm">
            {whenLabel}
          </span>

          {/* Hover overlay */}
          <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 transition-transform duration-200 group-hover:translate-y-0">
            <span className="flex h-7 items-center gap-1.5 rounded-md bg-white/15 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm">
              View set
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }
              }}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-red-500/25 px-2.5 text-[11px] font-medium text-red-100 backdrop-blur-sm transition-colors hover:bg-red-500/40"
            >
              <Trash2 className="h-3 w-3" />
              Delete set
            </span>
          </span>
        </span>
      </button>

      <BatchDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={item}
        onDeleted={(id) => {
          onDeleted?.(id);
          setDetailOpen(false);
        }}
      />

      <DeleteGenerationConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        loading={deleting}
        onConfirm={confirmDelete}
        title={`Delete this set of ${item.totalImages} images?`}
        description="Permanently removes every image in this set from your library and storage."
        confirmLabel="Delete set"
      />
    </>
  );
}
