"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms; close the dialog from the parent on success. */
  onConfirm: () => Promise<void>;
  loading?: boolean;
};

export function DeleteGenerationConfirmDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => cancelRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent
        hideClose
        className="max-w-[min(100%,22rem)] border-white/[0.08] bg-bg-surface p-0 shadow-2xl sm:max-w-md"
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
        onInteractOutside={(e) => loading && e.preventDefault()}
      >
        <div className="border-b border-white/[0.06] bg-gradient-to-b from-red-500/[0.07] to-transparent px-6 pb-4 pt-5">
          <div className="flex gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-400/25"
              aria-hidden
            >
              <Trash2 className="h-4 w-4 text-red-300" strokeWidth={2} />
            </div>
            <DialogHeader className="m-0 flex-1 space-y-1.5 text-left">
              <DialogTitle className="text-base font-semibold leading-snug text-text-primary">
                Delete this generation?
              </DialogTitle>
              <DialogDescription className="text-left text-[13px] leading-snug text-text-secondary">
                Permanently removes it from your library and storage.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="border-t border-white/[0.04] bg-black/10 px-6 py-4">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            size="md"
            className="w-full border-white/[0.08] sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            className="w-full shadow-[0_0_0_1px_rgba(239,68,68,0.12)] sm:w-auto"
            loading={loading}
            iconLeft={!loading ? <Trash2 className="h-4 w-4" aria-hidden /> : undefined}
            onClick={() => void onConfirm()}
          >
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
