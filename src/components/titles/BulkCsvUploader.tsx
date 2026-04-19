"use client";

import * as React from "react";
import { AlertCircle, Download, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { parseCSVHeaders } from "@/lib/csv-parse";
import { cn } from "@/lib/utils";

const REQUIRED = ["product_name", "category", "price"] as const;
const MAX_BYTES = 512_000;
const MAX_DATA_ROWS = 200;

type JobStatusPayload = {
  jobId?: string;
  status?: string;
  totalRows?: number;
  processedRows?: number;
  failedRows?: number;
  progress?: number;
  outputFileUrl?: string | null;
  errorSummary?: unknown;
  completedAt?: string | null;
  error?: string;
};

type RowErr = { row?: number; productName?: string; error?: string };

function normalizeErrors(raw: unknown): RowErr[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 10).map((e) => {
    if (!e || typeof e !== "object") return {};
    const o = e as Record<string, unknown>;
    return {
      row: typeof o.row === "number" ? o.row : undefined,
      productName: typeof o.productName === "string" ? o.productName : undefined,
      error: typeof o.error === "string" ? o.error : undefined,
    };
  });
}

function formatEta(processed: number, total: number, startedAt: number | null): string | null {
  if (!startedAt || processed <= 0 || total <= 0 || processed >= total) return null;
  const elapsedSec = (Date.now() - startedAt) / 1000;
  if (elapsedSec < 0.5) return null;
  const rate = processed / elapsedSec;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const remaining = (total - processed) / rate;
  if (remaining > 7200) return "ETA: more than 2 hours (rough)";
  if (remaining > 120) return `ETA: ~${Math.round(remaining / 60)} min`;
  return `ETA: ~${Math.max(5, Math.round(remaining))}s`;
}

export function BulkCsvUploader() {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [clientError, setClientError] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<"hinglish" | "hindi" | "english">("hinglish");
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [job, setJob] = React.useState<JobStatusPayload | null>(null);
  const progressStartedAt = React.useRef<number | null>(null);
  const terminalToastJobId = React.useRef<string | null>(null);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = React.useCallback(() => {
    setFile(null);
    setClientError(null);
    setUploading(false);
    setJobId(null);
    setJob(null);
    progressStartedAt.current = null;
    terminalToastJobId.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const validateCsvText = React.useCallback((text: string, sizeBytes: number): string | null => {
    if (sizeBytes > MAX_BYTES) return "File too large. Max 500KB (~200 products).";
    const lines = text.split(/\n/).filter((l) => l.trim());
    if (lines.length < 2) return "CSV needs a header row plus at least one product row.";
    if (lines.length > MAX_DATA_ROWS + 1) return `Too many rows. Maximum ${MAX_DATA_ROWS} products per batch.`;
    const headers = parseCSVHeaders(lines[0] ?? "");
    const missing = REQUIRED.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return `Missing required columns: ${missing.join(", ")}. Required: product_name, category, price.`;
    }
    return null;
  }, []);

  const ingestFile = React.useCallback(
    async (f: File) => {
      setClientError(null);
      setJobId(null);
      setJob(null);
      progressStartedAt.current = null;
      if (!f.name.toLowerCase().endsWith(".csv")) {
        setFile(null);
        setClientError("Please choose a .csv file.");
        return;
      }
      const text = await f.text();
      const err = validateCsvText(text, f.size);
      if (err) {
        setFile(null);
        setClientError(err);
        return;
      }
      setFile(f);
    },
    [validateCsvText]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void ingestFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void ingestFile(f);
  };

  React.useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/titles/bulk/${jobId}/status`);
        const json = (await res.json()) as JobStatusPayload;
        if (cancelled) return;
        setJob(json);
        const st = json.status ?? "";
        if (st === "processing" || st === "pending") {
          if ((json.processedRows ?? 0) > 0 && progressStartedAt.current == null) {
            progressStartedAt.current = Date.now();
          }
        }
        if (st === "complete" || st === "failed") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        if (!cancelled) toast.error("Status poll failed");
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };

    void tick();
    pollIntervalRef.current = setInterval(() => void tick(), 3000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, toast]);

  React.useEffect(() => {
    if (!jobId || !job?.status) return;
    if (job.status !== "complete" && job.status !== "failed") return;
    if (terminalToastJobId.current === jobId) return;
    terminalToastJobId.current = jobId;
    if (job.status === "complete") {
      const failed = job.failedRows ?? 0;
      toast.success(
        "Bulk job finished",
        failed > 0 ? `${failed} row(s) had errors — see below and download the output CSV.` : "Download your output CSV."
      );
    } else {
      const first = normalizeErrors(job.errorSummary)[0]?.error;
      toast.error("Bulk job failed", first ?? "Check error details below.");
    }
  }, [jobId, job?.status, job?.failedRows, job?.errorSummary, toast]);

  async function upload() {
    if (!file) {
      toast.warning("No file", "Choose a CSV first.");
      return;
    }
    setUploading(true);
    setClientError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("language", language);
      const res = await fetch("/api/titles/bulk", { method: "POST", body: fd });
      const json = (await res.json()) as { jobId?: string; error?: string; totalRows?: number };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      if (!json.jobId) throw new Error("No job id returned");
      setJobId(json.jobId);
      setJob({
        jobId: json.jobId,
        status: "pending",
        totalRows: json.totalRows ?? 0,
        processedRows: 0,
        failedRows: 0,
        progress: 0,
      });
      progressStartedAt.current = null;
      toast.success("Queued", "Processing runs in the background worker (Gemini). This page will update every few seconds.");
    } catch (e) {
      setClientError(e instanceof Error ? e.message : "Upload failed");
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const terminal = job?.status === "complete" || job?.status === "failed";
  const processing = jobId && !terminal;
  const errors = normalizeErrors(job?.errorSummary);
  const total = job?.totalRows ?? 0;
  const processed = job?.processedRows ?? 0;
  const pct = typeof job?.progress === "number" ? job.progress : total > 0 ? Math.round((processed / total) * 100) : 0;
  const eta = processing ? formatEta(processed, total, progressStartedAt.current) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Bulk title CSV</p>
              <p className="mt-1 max-w-xl text-xs text-text-tertiary">
                Upload up to {MAX_DATA_ROWS} products. Each row is generated with Gemini (same pipeline style as single optimize). Requires{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[10px]">REDIS_URL</code> and{" "}
                <code className="rounded bg-black/30 px-1 py-0.5 text-[10px]">npm run worker:bulk-titles</code> running.
              </p>
            </div>
          </div>
          <a
            href="/api/titles/bulk/template"
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-xs font-medium text-text-primary hover:bg-white/[0.06]"
          >
            <Download className="h-3.5 w-3.5" />
            Download template
          </a>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-text-tertiary">Default language (per-row override via optional column)</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              disabled={Boolean(processing)}
            >
              <option value="hinglish">Hinglish</option>
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !processing && inputRef.current?.click()}
          className={cn(
            "mt-4 cursor-pointer rounded-xl border border-dashed p-8 text-center transition-colors",
            dragOver ? "border-emerald-400/50 bg-emerald-500/5" : "border-white/[0.12] bg-black/20 hover:border-white/[0.2]",
            processing ? "pointer-events-none opacity-60" : ""
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onInputChange}
            disabled={Boolean(processing)}
          />
          {file ? (
            <p className="text-sm text-text-primary">
              <span className="font-medium">{file.name}</span>
              <span className="ml-2 text-text-tertiary">({(file.size / 1024).toFixed(1)} KB)</span>
            </p>
          ) : (
            <p className="text-sm text-text-secondary">Drop your CSV here or click to browse</p>
          )}
          <p className="mt-2 text-[11px] text-text-tertiary">Required columns: product_name, category, price</p>
        </div>

        {clientError ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{clientError}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={!file || uploading || Boolean(processing)} className="gap-2" onClick={() => void upload()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload & queue"}
          </Button>
          <Button type="button" variant="ghost" className="gap-2" onClick={() => reset()} disabled={uploading}>
            <RotateCcw className="h-4 w-4" />
            {terminal ? "Process another CSV" : "Reset"}
          </Button>
        </div>
      </div>

      {jobId ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Job status</p>
          <p className="mt-1 font-mono text-xs text-text-secondary">{jobId}</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>Status: {job?.status ?? "…"}</span>
              <span>
                {processed}/{total} rows
                {typeof job?.failedRows === "number" && job.failedRows > 0 ? ` · ${job.failedRows} failed` : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  job?.status === "failed" ? "bg-red-400/80" : "bg-emerald-400/90"
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <p className="text-xs text-text-tertiary">
              {processing ? (
                <>
                  Polling every 3s (pauses while the tab is hidden). {eta ?? "Computing ETA…"}
                </>
              ) : job?.status === "complete" ? (
                <>
                  <span className="block text-sm font-medium text-emerald-200/95">
                    {Math.max(0, total - (job.failedRows ?? 0))} optimized · {job.failedRows ?? 0} failed
                  </span>
                  <span className="block">
                    Finished{job.completedAt ? ` · ${new Date(job.completedAt).toLocaleString()}` : ""}.
                  </span>
                </>
              ) : job?.status === "failed" ? (
                <>Job did not complete successfully.</>
              ) : (
                <>Waiting…</>
              )}
            </p>
          </div>

          {job?.status === "complete" && job.outputFileUrl ? (
            <div className="mt-4">
              <a
                href={job.outputFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/30"
              >
                <Download className="h-4 w-4" />
                Download results CSV
              </a>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-200">Sample errors (up to 10)</p>
              <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                {errors.map((er, i) => (
                  <li key={i}>
                    {er.row != null ? `Row ${er.row}` : "Row ?"}
                    {er.productName ? ` · ${er.productName}` : ""}
                    {er.error ? ` — ${er.error}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
