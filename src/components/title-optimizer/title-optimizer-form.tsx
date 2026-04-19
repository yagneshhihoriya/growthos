"use client";

import * as React from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { TagInput } from "@/components/ui/tag-input";
import { PillSelector } from "@/components/ui/pill-selector";
import { PlatformSelector } from "@/components/title-optimizer/platform-selector";
import { CompetitorToggle } from "@/components/title-optimizer/competitor-toggle";
import { TitleResults } from "@/components/title-optimizer/title-results";
import { CaptionCategorySelect as CategorySelect } from "@/components/captions/category-select";
import { CharCountTextarea } from "@/components/ui/char-count-input";
import { SkeletonTitleResult } from "@/components/title-optimizer/skeleton-result";
import { toast } from "@/lib/toast";
import { TitleFormSchema, type TitleFormInput } from "@/lib/schemas/title-optimizer";
import { PLATFORM_CONFIG, type GeneratedTitleResult } from "@/types/title-optimizer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TITLE_LOADING_MESSAGES } from "@/lib/loading-messages";
import { cn } from "@/lib/utils";
import { consumeTitleGenerationStream } from "@/hooks/use-title-stream";
import { useFormPersist } from "@/hooks/use-form-persist";

const TITLE_DRAFT_KEY = "growthos:title-optimizer-form:v1";
const TITLE_RESULTS_KEY = "growthos:title-optimizer-results:v1";

const DEFAULT_VALUES: TitleFormInput = {
  productName: "",
  category: "",
  price: 0,
  catalogProductId: undefined,
  variants: [],
  currentTitle: undefined,
  platforms: ["amazon"],
  language: "hinglish",
  outputType: "title_and_desc",
  includeCompetitorAnalysis: true,
};

const OUTPUT_LABELS: Record<string, string> = {
  title_and_desc: "Title + desc",
  title_only: "Title only",
  keywords: "Keywords",
};

const LANG_LABELS: Record<string, string> = {
  hinglish: "Hinglish",
  hindi: "Hindi",
  english: "English",
};

export function TitleOptimizerForm({ onSuccess }: { onSuccess?: () => void }) {
  const [results, setResults] = React.useState<GeneratedTitleResult[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(TITLE_RESULTS_KEY);
      if (!raw) return [];
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? (j as GeneratedTitleResult[]) : [];
    } catch {
      return [];
    }
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [loadingLine, setLoadingLine] = React.useState(0);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<TitleFormInput>({
    resolver: zodResolver(TitleFormSchema) as Resolver<TitleFormInput>,
    defaultValues: DEFAULT_VALUES,
  });

  const validateTitleMerged = React.useCallback((merged: TitleFormInput) => {
    const s = TitleFormSchema.partial().safeParse(merged);
    if (!s.success) return null;
    return { ...DEFAULT_VALUES, ...s.data } as TitleFormInput;
  }, []);

  const { clearPersisted } = useFormPersist<TitleFormInput>({
    key: TITLE_DRAFT_KEY,
    watch,
    reset,
    defaultValues: DEFAULT_VALUES,
    debounceMs: 500,
    validateMerged: validateTitleMerged,
    onRestored: (values) => {
      if (String(values.productName ?? "").trim() || String(values.category ?? "").trim()) {
        setLastSaved(new Date());
      }
    },
    onSaved: () => setLastSaved(new Date()),
  });

  React.useEffect(() => {
    try {
      if (results.length > 0) {
        window.localStorage.setItem(TITLE_RESULTS_KEY, JSON.stringify(results));
      } else {
        window.localStorage.removeItem(TITLE_RESULTS_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [results]);

  const watchedPlatforms = watch("platforms");
  const watchedLanguage = watch("language");
  const watchedOutput = watch("outputType");

  React.useEffect(() => {
    if (!isGenerating) return;
    const t = window.setInterval(() => {
      setLoadingLine((i) => (i + 1) % TITLE_LOADING_MESSAGES.length);
    }, 3200);
    return () => window.clearInterval(t);
  }, [isGenerating]);

  const summaryPlatforms =
    watchedPlatforms?.map((p) => PLATFORM_CONFIG[p].label).join(" + ") || "No platform";
  const summaryLabel = `${summaryPlatforms} · ${LANG_LABELS[watchedLanguage]} · ${OUTPUT_LABELS[watchedOutput]}`;

  const onSubmit = async (data: TitleFormInput) => {
    setIsGenerating(true);
    setLoadingLine(0);
    setResults([]);
    try {
      const res = await fetch("/api/titles/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(data),
      });

      const ct = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        if (ct.includes("application/json")) {
          const result = (await res.json()) as {
            success?: boolean;
            error?: { code?: string; message?: string; details?: unknown };
          };
          if (res.status === 429) {
            toast.warning("Generation limit reached", {
              description: result.error?.message ?? "Try again in an hour.",
            });
          } else if (res.status === 400) {
            toast.error("Check the form", { description: "Fix highlighted fields." });
          } else {
            toast.error("Generation failed", {
              description: result.error?.message ?? "Please try again.",
            });
          }
        } else {
          toast.error("Generation failed", { description: `HTTP ${res.status}` });
        }
        return;
      }

      if (!ct.includes("text/event-stream")) {
        const result = (await res.json()) as {
          success?: boolean;
          data?: { results?: GeneratedTitleResult[] };
          error?: { message?: string };
        };
        if (result.success && result.data?.results?.length) {
          setResults(result.data.results);
          toast.success("Titles generated", {
            description: `${result.data.results.length} platform${result.data.results.length > 1 ? "s" : ""} optimised.`,
          });
          onSuccess?.();
        } else {
          toast.error("Generation failed", { description: result.error?.message ?? "Please try again." });
        }
        return;
      }

      await consumeTitleGenerationStream(res.body, {
        onResults: (acc) => setResults([...acc]),
        onComplete: (ev) => {
          if (ev.success && ev.results?.length) {
            setResults(ev.results);
            toast.success("Titles generated", {
              description: `${ev.results.length} platform${ev.results.length > 1 ? "s" : ""} optimised.`,
            });
            onSuccess?.();
          } else {
            toast.error("Generation failed", { description: ev.error ?? "Please try again." });
          }
        },
      });
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasRightPanel = isGenerating || results.length > 0;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn(
        "max-w-full space-y-6",
        hasRightPanel && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start lg:gap-6 lg:space-y-0"
      )}
    >
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5 sm:px-5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary/80">Title inputs</span>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-purple-300/90 sm:text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
              {lastSaved ? "Draft saved" : "Draft"}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Clear all fields, saved results, and start fresh?")) return;
                clearPersisted();
                setResults([]);
                setLastSaved(null);
                try {
                  window.localStorage.removeItem(TITLE_RESULTS_KEY);
                } catch {
                  /* ignore */
                }
                toast.confirm("Form cleared");
              }}
              className="text-[10px] text-text-tertiary underline decoration-text-tertiary/40 underline-offset-2 transition-colors hover:text-text-secondary sm:text-xs"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div id="title-field-product" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="title-productName" className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Product name <span className="text-red-400">*</span>
              </label>
              <Controller
                name="productName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="title-productName"
                    placeholder="e.g. Cotton Kurti Set"
                    error={errors.productName?.message}
                  />
                )}
              />
            </div>
            <div>
              <label htmlFor="title-category" className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Category <span className="text-red-400">*</span>
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <CategorySelect
                    id="title-category"
                    value={field.value}
                    error={errors.category?.message}
                    onChange={(label) => field.onChange(label)}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Price (₹) <span className="text-red-400">*</span>
              </label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="499"
                    leftSlot={<span className="text-sm text-text-tertiary">₹</span>}
                    error={errors.price?.message}
                    value={field.value && field.value > 0 ? field.value : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? 0 : Number(v));
                    }}
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
              Colors / variants <span className="font-normal text-text-tertiary/60">(Enter to add)</span>
            </label>
            <Controller name="variants" control={control} render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
              Current title{" "}
              <span className="font-normal text-text-tertiary/60">
                (paste your live title to get a before/after improvement score)
              </span>
            </label>
            <Controller
              name="currentTitle"
              control={control}
              render={({ field }) => (
                <CharCountTextarea
                  maxLength={500}
                  rows={2}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  placeholder="Paste your live marketplace title here…"
                  className="mt-0 min-h-[60px] w-full resize-y rounded-md border border-border-default bg-bg-surface p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-500/35 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
              )}
            />
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary/70">
              Target platforms
            </p>
            <Controller
              name="platforms"
              control={control}
              render={({ field }) => (
                <PlatformSelector value={field.value} onChange={field.onChange} error={errors.platforms?.message} />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-tertiary">Language</label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <PillSelector
                    accent="purple"
                    aria-label="Output language"
                    options={[
                      { value: "hinglish", label: "Hinglish" },
                      { value: "hindi", label: "Hindi" },
                      { value: "english", label: "English" },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-tertiary">Output</label>
              <Controller
                name="outputType"
                control={control}
                render={({ field }) => (
                  <PillSelector
                    accent="purple"
                    variant="card"
                    aria-label="Generation output"
                    className="grid grid-cols-3 gap-2"
                    options={[
                      { value: "title_and_desc", label: "Title + desc", sub: "Title, copy, keywords" },
                      { value: "title_only", label: "Title only", sub: "Marketplace title" },
                      { value: "keywords", label: "Keywords", sub: "Search terms" },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <Controller
            name="includeCompetitorAnalysis"
            control={control}
            render={({ field }) => <CompetitorToggle value={field.value} onChange={field.onChange} />}
          />

          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary/70">
              What you&apos;ll get
            </p>
            <div className="space-y-2">
              {(!watchedPlatforms || watchedPlatforms.length === 0) ? (
                <p className="text-xs text-text-tertiary">Select at least one platform above to see what you&apos;ll get.</p>
              ) : (
                watchedPlatforms.map((p) => {
                  const config = PLATFORM_CONFIG[p];
                  const maxPart = config.charLimit ? ` (max ${config.charLimit} chars)` : "";
                  const desc =
                    watchedOutput === "title_and_desc"
                      ? `Optimised title + description + keywords${maxPart}`
                      : watchedOutput === "title_only"
                      ? `Optimised title only${maxPart}`
                      : `Optimised title + 15 search keywords`;
                  return (
                    <div key={p} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-[4.5rem] rounded border border-white/[0.08] bg-black/30 px-2 py-0.5 text-center text-[10px] font-medium text-text-secondary sm:text-xs">
                        {config.label}
                      </span>
                      <span className="text-xs text-text-tertiary">{desc}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <span className="rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[10px] text-text-tertiary sm:text-xs">
            {summaryLabel}
          </span>
          <Button
            type="submit"
            accessKey="g"
            disabled={isGenerating || !watchedPlatforms?.length}
            className="min-h-[44px] gap-2 bg-purple-600 px-4 text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? "Generating…" : "Generate titles"}
          </Button>
        </div>
      </div>

      {hasRightPanel ? (
        <div className="space-y-4 lg:sticky lg:top-20">
          {isGenerating ? (
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-xs leading-relaxed text-text-secondary">{TITLE_LOADING_MESSAGES[loadingLine]}</p>
              <SkeletonTitleResult />
            </div>
          ) : null}
          <TitleResults
            results={results}
            onTitleEdit={(platform, title) => {
              setResults((prev) =>
                prev.map((x) =>
                  x.platform === platform
                    ? {
                        ...x,
                        title,
                        charCount: title.length,
                      }
                    : x
                )
              );
            }}
          />
        </div>
      ) : null}
    </form>
  );
}
