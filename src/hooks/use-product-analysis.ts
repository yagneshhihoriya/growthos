"use client";

import * as React from "react";
import type {
  AnalysisState,
  ProductAnalysis,
} from "@/types/photo-studio";

/**
 * Runs Gemini Vision analysis against the already-uploaded S3 image URL.
 *
 * Why URL-based (not base64): our UploadZone PUTs straight to S3 and keeps
 * only the resulting URL in client state — we never touch a File/Blob here.
 * The /api/images/analyze route re-fetches the object server-side via
 * loadImageBufferForEdit, which is faster than shipping megabytes from the
 * browser.
 *
 * Behaviour:
 *  - idle → analyzing → done | failed
 *  - Failure is silent — consumer should treat `failed` as "proceed without".
 *  - Results are cached in-memory per hook instance keyed by imageUrl so a
 *    seller who removes and re-drops the same image doesn't pay for a
 *    second Gemini call.
 *  - Each call aborts any in-flight previous call.
 */
export function useProductAnalysis() {
  const [state, setState] = React.useState<AnalysisState>({ status: "idle" });
  const abortRef = React.useRef<AbortController | null>(null);
  const cacheRef = React.useRef<Map<string, ProductAnalysis>>(new Map());

  const reset = React.useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setState({ status: "idle" });
  }, []);

  const analyze = React.useCallback(
    async (imageUrl: string): Promise<ProductAnalysis | null> => {
      if (!imageUrl) return null;

      const cached = cacheRef.current.get(imageUrl);
      if (cached) {
        setState({ status: "done", analysis: cached });
        return cached;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "analyzing" });

      try {
        const res = await fetch("/api/images/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { analysis: ProductAnalysis | null; fallback?: boolean }
          | null;

        if (!res.ok || !data?.analysis) {
          setState({ status: "failed" });
          return null;
        }

        cacheRef.current.set(imageUrl, data.analysis);
        setState({ status: "done", analysis: data.analysis });
        return data.analysis;
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return null;
        console.warn("[useProductAnalysis] silent failure:", err);
        setState({ status: "failed" });
        return null;
      }
    },
    []
  );

  const getAnalysis = React.useCallback((): ProductAnalysis | null => {
    return state.status === "done" ? state.analysis : null;
  }, [state]);

  return { state, analyze, reset, getAnalysis };
}
