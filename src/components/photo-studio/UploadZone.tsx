"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_FILES = 100;

interface FileEntry {
  id: string;
  name: string;
  preview: string;
  publicUrl?: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
}

export function UploadZone({
  uploadedUrls,
  onUploadedUrlsChange,
  maxFiles = DEFAULT_MAX_FILES,
  singleFile = false,
  dropLabel = "Drop product photos here",
  helperSuffix,
}: {
  uploadedUrls: string[];
  onUploadedUrlsChange: (urls: string[]) => void;
  /** Max files per session (single-file mode uses 1). */
  maxFiles?: number;
  /** Replace previous uploads when adding a new file. */
  singleFile?: boolean;
  dropLabel?: string;
  /** Extra line under file type hint, e.g. "one image for AI edit". */
  helperSuffix?: string;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [entries, setEntries] = React.useState<FileEntry[]>([]);
  const uploading = entries.some((e) => e.status === "uploading" || e.status === "pending");

  const effectiveMax = singleFile ? 1 : maxFiles;

  function updateEntry(id: string, upd: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...upd } : e)));
  }

  async function uploadSingleFile(entry: FileEntry, file: File): Promise<string | null> {
    updateEntry(entry.id, { status: "uploading", progress: 5 });

    try {
      const presignRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      if (!presignRes.ok) {
        const errorBody = await presignRes.json().catch(() => ({ error: "Unknown error" }));
        const msg = (errorBody as { error?: string }).error ?? `Upload failed (${presignRes.status})`;
        throw new Error(msg);
      }
      const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string };
      updateEntry(entry.id, { progress: 15 });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateEntry(entry.id, { progress: Math.round((e.loaded / e.total) * 80) + 15 });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      updateEntry(entry.id, { status: "uploaded", progress: 100, publicUrl });
      return publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateEntry(entry.id, { status: "error", error: msg });
      toast.error("Upload failed", msg);
      return null;
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    let list = Array.from(files);
    if (list.length === 0) return;

    if (singleFile) {
      for (const e of entries) {
        if (e.preview) URL.revokeObjectURL(e.preview);
      }
      setEntries([]);
      list = list.slice(0, 1);
    }

    if (!singleFile && entries.length + list.length > effectiveMax) {
      toast.error("Too many files", `You can upload up to ${effectiveMax} image(s) at once.`);
      return;
    }

    const newEntries: { entry: FileEntry; file: File }[] = [];
    for (const file of list) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Unsupported file", `${file.name} is not a JPG, PNG, or WEBP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File too large", `${file.name} exceeds 25MB.`);
        continue;
      }
      const entry: FileEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        preview: URL.createObjectURL(file),
        status: "pending",
        progress: 0,
      };
      newEntries.push({ entry, file });
    }
    if (newEntries.length === 0) return;

    setEntries((prev) => [...prev, ...newEntries.map((ne) => ne.entry)]);

    const nextUrls = singleFile ? [] : [...uploadedUrls];
    const urlsOk: string[] = [];
    await Promise.all(
      newEntries.map(async ({ entry, file }) => {
        const url = await uploadSingleFile(entry, file);
        if (url) urlsOk.push(url);
      })
    );
    nextUrls.push(...urlsOk);
    onUploadedUrlsChange(nextUrls);

    const ok = urlsOk.length;
    const fail = newEntries.length - ok;
    if (ok > 0 && fail === 0) {
      toast.success("Upload complete", ok === 1 ? "1 image ready." : `${ok} images ready.`);
    } else if (ok > 0 && fail > 0) {
      toast.warning("Partial upload", `${ok} succeeded, ${fail} failed.`);
    }
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.preview) URL.revokeObjectURL(e.preview);
      if (e?.publicUrl) {
        onUploadedUrlsChange(uploadedUrls.filter((u) => u !== e.publicUrl));
      }
      return prev.filter((x) => x.id !== id);
    });
  }

  const hintLine = helperSuffix
    ? `JPG, PNG, WEBP · Max 25MB · ${helperSuffix}`
    : `JPG, PNG, WEBP · Max 25MB · Up to ${effectiveMax} image${effectiveMax === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200",
          dragActive
            ? "border-purple-500/50 bg-purple-500/[0.04] shadow-[0_0_24px_rgba(168,85,247,0.08)]"
            : "border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.01]"
        )}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); void uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        aria-label="Upload product photos"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={!singleFile}
          className="hidden"
          onChange={(e) => { const f = e.target.files; if (f) void uploadFiles(f); e.target.value = ""; }}
        />

        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-colors", dragActive ? "bg-purple-500/15" : "bg-white/[0.04]")}>
          <ImagePlus className={cn("h-6 w-6 transition-colors", dragActive ? "text-purple-400" : "text-text-tertiary")} />
        </div>
        <p className="mt-3 text-sm font-medium text-text-primary">
          {uploading ? "Uploading…" : dropLabel}
        </p>
        <p className="mt-1 text-[13px] text-text-tertiary">
          or <span className="text-text-secondary underline underline-offset-2">browse files</span>
        </p>
        <p className="mt-3 text-[11px] text-text-tertiary">
          {hintLine}
        </p>
      </div>

      {entries.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium text-text-tertiary">
            {entries.filter((e) => e.status === "uploaded").length} of {entries.length} uploaded
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {entries.map((entry) => (
              <div key={entry.id} className="group/thumb relative overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
                <div className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.preview} alt={entry.name} className="h-full w-full object-cover" />
                </div>

                {entry.status === "uploading" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06]">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}

                {entry.status === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                    <span className="text-[10px] font-medium text-red-300">Failed</span>
                  </div>
                )}

                {entry.status === "uploaded" && (
                  <div className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
                  aria-label={`Remove ${entry.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
