"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  ImageIcon,
  Layers,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { UploadZone } from "@/components/photo-studio/UploadZone";
import { BeforeAfterSlider } from "@/components/photo-studio/BeforeAfterSlider";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { QUICK_STUDIO_PROMPTS } from "@/lib/quick-studio-prompts";
import {
  AMAZON_LISTING_PRESET,
  FULL_PRESET,
  IMAGE_STYLE_CONFIG,
  INSTAGRAM_PRESET,
  PRODUCT_CATEGORY_OPTIONS,
  type ImageStyle,
  type ProductCategory,
} from "@/types/photo-studio";
import { useMultiImageStream } from "@/hooks/use-multi-image-stream";
import { downloadAllImages, downloadSingleImage } from "@/lib/download-images";

export type StudioMode = "edit" | "create";

const PRESETS: { label: string; styles: ImageStyle[] }[] = [
  { label: "Amazon listing (5)", styles: AMAZON_LISTING_PRESET },
  { label: "Instagram (3)", styles: INSTAGRAM_PRESET },
  { label: "Full set (5)", styles: FULL_PRESET },
];

function arraysEqual(a: ImageStyle[], b: ImageStyle[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function GeneratePanel({ onGenerationComplete }: { onGenerationComplete?: () => void }) {
  const [mode, setMode] = React.useState<StudioMode>("edit");
  const [uploadedUrls, setUploadedUrls] = React.useState<string[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState<{ generatedUrl: string; originalUrl: string } | null>(null);
  const [compare, setCompare] = React.useState(false);

  // Multi-image state (edit mode only).
  const [multipleMode, setMultipleMode] = React.useState(false);
  const [productCategory, setProductCategory] = React.useState<ProductCategory>("clothing");
  const [selectedStyles, setSelectedStyles] = React.useState<ImageStyle[]>([]);
  const multi = useMultiImageStream();
  const resultsRef = React.useRef<HTMLDivElement | null>(null);

  const imageUrl = uploadedUrls[0] ?? null;

  function toggleStyle(style: ImageStyle) {
    setSelectedStyles((prev) => {
      if (prev.includes(style)) return prev.filter((s) => s !== style);
      if (prev.length >= 5) return prev;
      return [...prev, style];
    });
  }

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.warning("Add a prompt", { description: "Describe how you want the image to look." });
      return;
    }
    if (mode === "edit" && !imageUrl) {
      toast.warning("Upload an image", { description: "Edit mode needs a photo to transform." });
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
        toast.error("Generation failed", { description: msg });
        return;
      }
      const { generatedUrl, originalUrl: apiOriginalUrl } = json as {
        generatedUrl: string;
        originalUrl?: string;
        jobId: string;
      };
      const originalForCompare = mode === "edit" ? (apiOriginalUrl ?? imageUrl!) : "";
      setResult({ generatedUrl, originalUrl: originalForCompare });
      onGenerationComplete?.();
      toast.success("Ready", { description: "Your image is ready to download." });
    } catch {
      toast.error("Generation failed", { description: "Please try again." });
    } finally {
      setGenerating(false);
    }
  }

  async function generateMultiple() {
    if (!imageUrl) {
      toast.warning("Upload an image", { description: "Upload a product photo first." });
      return;
    }
    if (selectedStyles.length === 0) {
      toast.warning("Pick at least one style", { description: "Choose up to 5 styles." });
      return;
    }
    await multi.generate({
      imageUrl,
      category: productCategory,
      styles: selectedStyles,
      customInstructions: prompt.trim() || undefined,
    });
    onGenerationComplete?.();
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const multiCompletedCount = multi.completedCount;
  const multiTotalCount = multi.totalCount || selectedStyles.length;

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
            setMultipleMode(false);
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
          {multipleMode ? "Extra instructions (optional)" : "Your prompt"}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            multipleMode
              ? "e.g. Keep the dupatta draped exactly as shown, avoid pink tones…"
              : mode === "edit"
                ? "e.g. Place the product on a marble counter with morning window light…"
                : "e.g. A red silk saree on a mannequin in a Rajasthani courtyard with soft sunlight…"
          }
          rows={multipleMode ? 2 : 4}
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
        />
      </div>

      {!multipleMode && (
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
      )}

      {/* Single-image Generate (hidden when multi-mode is ON) */}
      {!multipleMode && (
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
      )}

      {!multipleMode && result && (
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

      {/* Multiple images toggle (edit mode only) */}
      {mode === "edit" && (
        <div className="border-t border-white/[0.06] pt-6">
          <button
            type="button"
            onClick={() => setMultipleMode((v) => !v)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
              multipleMode
                ? "border-purple-500/50 bg-purple-500/[0.08] ring-1 ring-purple-500/20"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
            )}
            aria-pressed={multipleMode}
          >
            <div
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
                multipleMode ? "border-purple-400 bg-purple-500" : "border-white/[0.18] bg-black/30"
              )}
            >
              {multipleMode && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </div>
            <div className="flex items-start gap-2">
              <Layers className={cn("mt-0.5 h-4 w-4 shrink-0", multipleMode ? "text-purple-300" : "text-text-tertiary")} />
              <div>
                <p className={cn("text-sm font-medium", multipleMode ? "text-purple-100" : "text-text-primary")}>
                  Generate multiple images
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-tertiary">
                  Create 3–5 versions of your product in different styles — ready for Amazon, Flipkart, and Instagram in one click.
                </p>
              </div>
            </div>
          </button>

          {multipleMode && (
            <div className="mt-4 space-y-5">
              {/* Category */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Product category
                  <span className="ml-1 font-normal normal-case tracking-normal text-text-tertiary/70">
                    (helps the AI understand your product)
                  </span>
                </label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] text-text-primary focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                >
                  {PRODUCT_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-neutral-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick presets */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Quick presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => {
                    const active = arraysEqual(selectedStyles, preset.styles);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSelectedStyles(preset.styles)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
                          active
                            ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                            : "border-white/[0.08] bg-white/[0.03] text-text-secondary hover:border-white/[0.14] hover:text-text-primary"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                  {selectedStyles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStyles([])}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-text-tertiary transition-all hover:border-white/[0.14] hover:text-text-primary"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Style grid */}
              <div>
                <div className="mb-2 flex items-end justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Select styles
                    <span className="ml-1 font-normal normal-case tracking-normal text-text-tertiary/70">
                      (pick 1–5)
                    </span>
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {selectedStyles.length}/5 selected
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.values(IMAGE_STYLE_CONFIG).map((cfg) => {
                    const isSelected = selectedStyles.includes(cfg.value);
                    const disabled = !isSelected && selectedStyles.length >= 5;
                    return (
                      <button
                        key={cfg.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleStyle(cfg.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          isSelected
                            ? "border-purple-500/50 bg-purple-500/[0.08] ring-1 ring-purple-500/20"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
                          disabled && "cursor-not-allowed opacity-40"
                        )}
                      >
                        <span className="text-lg leading-none" aria-hidden>
                          {cfg.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-medium", isSelected ? "text-purple-100" : "text-text-primary")}>
                            {cfg.label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">
                            {cfg.description}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {cfg.platformBadges.map((badge) => (
                              <span
                                key={badge}
                                className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-text-tertiary"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-generate button */}
              <button
                type="button"
                onClick={() => void generateMultiple()}
                disabled={
                  multi.isGenerating ||
                  selectedStyles.length === 0 ||
                  !imageUrl
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-6 text-sm font-bold text-white shadow-[0_6px_20px_-4px_rgba(168,85,247,0.45)] transition-all hover:shadow-[0_8px_28px_-4px_rgba(168,85,247,0.55)] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {multi.isGenerating ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating {multiCompletedCount} of {multiTotalCount}…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate {selectedStyles.length || ""} image
                    {selectedStyles.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results grid — shown as soon as a multi-generation starts */}
          {multipleMode && (multi.isGenerating || Object.keys(multi.styleStatuses).length > 0) && (
            <div ref={resultsRef} className="mt-6 border-t border-white/[0.06] pt-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Generated images</h3>
                  <p className="mt-0.5 text-[11px] text-text-tertiary">
                    Hover any finished image to download or use it in a post.
                  </p>
                </div>
                {multi.results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void downloadAllImages(multi.results)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-medium text-text-primary transition-colors hover:bg-white/[0.07]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {selectedStyles.map((style) => {
                  const config = IMAGE_STYLE_CONFIG[style];
                  const status = multi.styleStatuses[style] ?? "pending";
                  const resultItem = multi.results.find((r) => r.style === style);

                  return (
                    <div key={style} className="group relative">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                        {status === "pending" && (
                          <div className="text-center">
                            <span className="text-2xl">{config.icon}</span>
                            <p className="mt-1 text-[11px] text-text-tertiary">Waiting…</p>
                          </div>
                        )}
                        {status === "generating" && (
                          <div className="text-center">
                            <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-purple-500/80 border-t-transparent" />
                            <p className="mt-2 text-[11px] text-text-tertiary">Generating…</p>
                          </div>
                        )}
                        {status === "done" && resultItem && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resultItem.imageUrl}
                              alt={config.label}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => void downloadSingleImage(resultItem.imageUrl, style)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg"
                                aria-label={`Download ${config.label}`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <a
                                href={`/social-posts?image=${encodeURIComponent(resultItem.imageUrl)}`}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg"
                                aria-label={`Use ${config.label} in a post`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </a>
                            </div>
                          </>
                        )}
                        {status === "error" && (
                          <div className="p-2 text-center">
                            <AlertTriangle className="mx-auto h-5 w-5 text-red-400" />
                            <p className="mt-1 text-[11px] text-red-300">Failed</p>
                            <button
                              type="button"
                              onClick={() => {
                                if (!imageUrl) return;
                                void multi.generate({
                                  imageUrl,
                                  category: productCategory,
                                  styles: [style],
                                  customInstructions: prompt.trim() || undefined,
                                });
                              }}
                              className="mt-1 text-[11px] text-purple-300 underline underline-offset-2"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="truncate text-[11px] text-text-tertiary">{config.label}</p>
                        {status === "done" && (
                          <span className="text-[11px] text-emerald-400">✓ Done</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
