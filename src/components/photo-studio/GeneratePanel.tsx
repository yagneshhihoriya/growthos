"use client";

import * as React from "react";
import { Sparkles, Wand2, Download, RefreshCw, ImageIcon } from "lucide-react";
import { UploadZone } from "@/components/photo-studio/UploadZone";
import { BeforeAfterSlider } from "@/components/photo-studio/BeforeAfterSlider";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { QUICK_STUDIO_PROMPTS } from "@/lib/quick-studio-prompts";

export type StudioMode = "edit" | "create";

export function GeneratePanel({ onGenerationComplete }: { onGenerationComplete?: () => void }) {
  const toast = useToast();
  const [mode, setMode] = React.useState<StudioMode>("edit");
  const [uploadedUrls, setUploadedUrls] = React.useState<string[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState<{ generatedUrl: string; originalUrl: string } | null>(null);
  const [compare, setCompare] = React.useState(false);

  const imageUrl = uploadedUrls[0] ?? null;

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.warning("Add a prompt", "Describe how you want the image to look.");
      return;
    }
    if (mode === "edit" && !imageUrl) {
      toast.warning("Upload an image", "Edit mode needs a photo to transform.");
      return;
    }

    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: trimmed,
          ...(mode === "edit" ? { imageUrl } : {}),
        }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg = typeof json === "object" && json && "error" in json ? String((json as { error: string }).error) : "Generation failed";
        toast.error("Generation failed", msg);
        return;
      }
      const { generatedUrl } = json as { generatedUrl: string; jobId: string };
      const originalForCompare = mode === "edit" ? imageUrl! : "";
      setResult({ generatedUrl, originalUrl: originalForCompare });
      onGenerationComplete?.();
      toast.success("Ready", "Your image is ready to download.");
    } catch {
      toast.error("Generation failed", "Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("edit");
            setResult(null);
            setCompare(false);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-semibold transition-all sm:flex-none sm:px-6",
            mode === "edit"
              ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Edit image
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("create");
            setResult(null);
            setCompare(false);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-semibold transition-all sm:flex-none sm:px-6",
            mode === "create"
              ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25"
              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
          )}
        >
          <Wand2 className="h-4 w-4" />
          Create new
        </button>
      </div>

      <p className="text-sm text-text-tertiary">
        {mode === "edit"
          ? "Upload a photo, describe the scene or style you want, and Nano Banana 2 transforms it."
          : "Describe the image you want — no upload needed. Nano Banana 2 generates it from your prompt."}
      </p>

      {mode === "edit" && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Your image</p>
          <UploadZone
            uploadedUrls={uploadedUrls}
            onUploadedUrlsChange={setUploadedUrls}
            maxFiles={1}
            singleFile
            dropLabel="Drop your image here"
            helperSuffix="one image for AI edit"
          />
        </div>
      )}

      <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-primary">Nano Banana 2</p>
            <p className="mt-0.5 text-[11px] text-text-tertiary">
              Powered by Gemini image generation. Be specific about lighting, setting, and mood.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          Your prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "edit"
              ? "e.g. Place the product on a marble counter with morning window light…"
              : "e.g. A red silk saree on a mannequin in a Rajasthani courtyard with soft sunlight…"
          }
          rows={4}
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Quick prompts</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_STUDIO_PROMPTS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setPrompt(chip.prompt)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
                prompt === chip.prompt
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                  : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-text-primary"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={generating || !prompt.trim() || (mode === "edit" && !imageUrl)}
          onClick={() => void generate()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-6 text-sm font-bold text-white shadow-[0_6px_20px_-4px_rgba(168,85,247,0.45)] transition-all hover:shadow-[0_8px_28px_-4px_rgba(168,85,247,0.55)] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {generating ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate
        </button>
        {result && (
          <>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={generating}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-medium text-text-primary transition-colors hover:bg-white/[0.07] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
            <a
              href={`${result.generatedUrl}${result.generatedUrl.includes("?") ? "&" : "?"}download=1`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm font-medium text-text-primary transition-colors hover:bg-white/[0.07]"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            {mode === "edit" && result.originalUrl && (
              <button
                type="button"
                onClick={() => setCompare((c) => !c)}
                className="text-[13px] font-medium text-purple-400 hover:text-purple-300"
              >
                {compare ? "Hide compare" : "Compare before / after"}
              </button>
            )}
          </>
        )}
      </div>

      {result && (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
          {compare && mode === "edit" && result.originalUrl ? (
            <div className="mx-auto max-w-lg p-2">
              <BeforeAfterSlider beforeUrl={result.originalUrl} afterUrl={result.generatedUrl} />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.generatedUrl} alt="Generated" className="mx-auto max-h-[min(70vh,720px)] w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
