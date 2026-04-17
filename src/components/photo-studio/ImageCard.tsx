"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Download, Eye, Trash2 } from "lucide-react";
import { BeforeAfterSlider } from "@/components/photo-studio/BeforeAfterSlider";
import { DeleteGenerationConfirmDialog } from "@/components/photo-studio/DeleteGenerationConfirmDialog";
import { useToast } from "@/components/ui/toast";

export type LibraryJob = {
  id: string;
  originalUrl: string;
  processedUrls: Record<string, string> | null;
  createdAt: string;
  completedAt: string | null;
};

export function ImageCard({
  job,
  onDeleted,
}: {
  job: LibraryJob;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [mode, setMode] = React.useState<"thumb" | "compare">("thumb");
  const [deleting, setDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const after =
    job.processedUrls?.generated
    ?? job.processedUrls?.instagram
    ?? job.processedUrls?.amazon
    ?? Object.values(job.processedUrls ?? {})[0];

  const sizes = Object.keys(job.processedUrls ?? {});

  const runPermanentDelete = React.useCallback(async () => {
    const res = await fetch(`/api/images/library/${job.id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Delete failed");
    onDeleted?.(job.id);
  }, [job.id, onDeleted]);

  const openDeleteDialog = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  }, []);

  const confirmPermanentDelete = React.useCallback(async () => {
    setDeleting(true);
    try {
      await runPermanentDelete();
      toast.success("Deleted", "Removed from your library and storage.");
      setDeleteDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [runPermanentDelete, toast]);

  return (
    <>
    <div className="group relative overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
      {mode === "thumb" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={after ?? job.originalUrl} alt="Processed product" className="aspect-square w-full object-cover" />
      ) : after ? (
        <BeforeAfterSlider beforeUrl={job.originalUrl} afterUrl={after} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={job.originalUrl} alt="Original product" className="aspect-square w-full object-cover" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 transition-transform duration-200 group-hover:translate-y-0">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "thumb" ? "compare" : "thumb"))}
          className="flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <Eye className="h-3 w-3" />
          {mode === "thumb" ? "Compare" : "Thumb"}
        </button>
        {after && (
          <button
            type="button"
            onClick={() => {
              const href = after.startsWith("/") ? `${window.location.origin}${after}` : after;
              window.open(href, "_blank", "noopener,noreferrer");
            }}
            className="flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <Download className="h-3 w-3" />
            Open
          </button>
        )}
        <button
          type="button"
          disabled={deleting}
          onClick={openDeleteDialog}
          className="flex h-7 items-center gap-1.5 rounded-md bg-red-500/20 px-2.5 text-[11px] font-medium text-red-100 backdrop-blur-sm transition-colors hover:bg-red-500/35 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>

      {/* Touch-friendly delete (small screens — no hover overlay) */}
      <button
        type="button"
        disabled={deleting}
        title="Permanently delete"
        aria-label="Permanently delete"
        onClick={openDeleteDialog}
        className="absolute bottom-1.5 left-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 shadow-sm ring-1 ring-white/10 backdrop-blur-sm hover:bg-red-500/40 hover:text-white md:hidden"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Size badges */}
      {sizes.length > 0 && (
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-0.5">
          {sizes.slice(0, 3).map((k) => (
            <span key={k} className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/80 backdrop-blur-sm">
              {k}
            </span>
          ))}
          {sizes.length > 3 && (
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/60 backdrop-blur-sm">
              +{sizes.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/60 backdrop-blur-sm">
        {job.completedAt ? formatDistanceToNow(new Date(job.completedAt), { addSuffix: true }) : "—"}
      </div>
    </div>

    <DeleteGenerationConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      loading={deleting}
      onConfirm={confirmPermanentDelete}
    />
    </>
  );
}
