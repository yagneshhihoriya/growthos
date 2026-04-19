"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import type { ImageStyle, ProductCategory } from "@/types/photo-studio";

export type StyleStatus = "pending" | "generating" | "done" | "error";

export interface StreamResult {
  style: ImageStyle;
  imageUrl: string;
  jobId?: string;
}

export interface GenerateMultiParams {
  imageUrl: string;
  category: ProductCategory;
  styles: ImageStyle[];
  customInstructions?: string;
  productId?: string;
}

interface ServerEvent {
  type:
    | "start"
    | "style_start"
    | "style_done"
    | "style_error"
    | "fatal"
    | "done";
  total?: number;
  batchId?: string;
  style?: ImageStyle;
  imageUrl?: string;
  jobId?: string;
  error?: string;
  processed?: number;
  failed?: number;
}

export function useMultiImageStream() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [styleStatuses, setStyleStatuses] = React.useState<
    Partial<Record<ImageStyle, StyleStatus>>
  >({});
  const [results, setResults] = React.useState<StreamResult[]>([]);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);

  const reset = React.useCallback(() => {
    setIsGenerating(false);
    setStyleStatuses({});
    setResults([]);
    setCompletedCount(0);
    setTotalCount(0);
  }, []);

  const generate = React.useCallback(
    async (params: GenerateMultiParams) => {
      setIsGenerating(true);
      setResults([]);
      setCompletedCount(0);
      setTotalCount(params.styles.length);
      const initial: Partial<Record<ImageStyle, StyleStatus>> = {};
      for (const s of params.styles) initial[s] = "pending";
      setStyleStatuses(initial);

      try {
        const res = await fetch("/api/images/generate-multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (res.status === 401) {
          toast.error("Session expired", { description: "Please log in again." });
          setIsGenerating(false);
          return;
        }
        if (res.status === 429) {
          toast.warning("Daily limit reached", {
            description: "Image generation resets at midnight.",
          });
          setIsGenerating(false);
          return;
        }
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error("Generation failed", {
            description: body?.error ?? "Please try again.",
          });
          setIsGenerating(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let successCount = 0;
        let failCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const block of events) {
            const line = block.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event: ServerEvent;
            try {
              event = JSON.parse(line.slice(6)) as ServerEvent;
            } catch {
              continue;
            }

            if (event.type === "style_start" && event.style) {
              setStyleStatuses((s) => ({ ...s, [event.style!]: "generating" }));
            } else if (event.type === "style_done" && event.style && event.imageUrl) {
              setStyleStatuses((s) => ({ ...s, [event.style!]: "done" }));
              setResults((r) => [
                ...r,
                { style: event.style!, imageUrl: event.imageUrl!, jobId: event.jobId },
              ]);
              setCompletedCount((c) => c + 1);
              successCount += 1;
            } else if (event.type === "style_error" && event.style) {
              setStyleStatuses((s) => ({ ...s, [event.style!]: "error" }));
              failCount += 1;
            } else if (event.type === "fatal") {
              toast.error("Generation failed", {
                description: event.error ?? "Please try again.",
              });
            } else if (event.type === "done") {
              if (successCount > 0) {
                toast.success(
                  `${successCount} image${successCount > 1 ? "s" : ""} generated`,
                  {
                    description:
                      failCount > 0
                        ? `${failCount} failed — click Retry on those cards.`
                        : "Click any image to download or use in a post.",
                  }
                );
              } else if (failCount > 0) {
                toast.error("All styles failed", {
                  description: "Check the image and try again.",
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("[useMultiImageStream]", err);
        toast.error("Generation failed", { description: "Please try again." });
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    isGenerating,
    styleStatuses,
    results,
    completedCount,
    totalCount,
    generate,
    reset,
  };
}
