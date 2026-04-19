"use client";

import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { PlatformSelector, type SocialPlatform } from "@/components/social/PlatformSelector";
import {
  CaptionForm,
  CAPTION_DRAFT_KEY,
  CAPTION_OUTPUT_KEY,
  CAPTION_DEFAULT_VALUES,
  CAPTION_ALLOWED_TARGET_AUDIENCE,
  meaningfulCaptionDraft,
} from "@/components/captions/caption-form";
import { AdvancedOptionsPanel } from "@/components/captions/advanced-options-panel";
import { ImagePickerTabs, type CaptionPrefill } from "@/components/social/ImagePickerTabs";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useFormPersist } from "@/hooks/use-form-persist";
import { CaptionFormSchema, type CaptionFormInput } from "@/lib/schemas/caption";
import { detectProductSuperCategory } from "@/lib/title-pipeline";
import type { CaptionVariant } from "@/types/caption";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "growthos:post-composer:v1";

type Props = {
  hasInstagram: boolean;
  hasFacebook: boolean;
  onScheduled: () => void;
};

/** Reject obvious client-side bad URLs before we round-trip to the API.
 *  Server still runs the canonical check via toPublicPostableUrl(). */
function validatePostableUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "Choose an image first.";
  if (trimmed.startsWith("blob:")) {
    return "This image is a local preview — upload it to storage before scheduling.";
  }
  if (trimmed.startsWith("data:")) {
    return "Data URIs can't be posted to Instagram — upload the image first.";
  }
  if (trimmed.startsWith("/")) return null;
  if (/^https:\/\//i.test(trimmed)) return null;
  if (/^http:\/\//i.test(trimmed)) {
    return "Image URL must use https (Instagram rejects http).";
  }
  return "Image URL must be https or an app-resolvable storage reference.";
}

type DraftBundle = {
  imageUrl: string;
  prefill: CaptionPrefill | null;
  caption: string;
  hashtags: string[];
  platforms: SocialPlatform[];
  scheduleMode: "auto" | "pick" | "now" | "draft";
  pickIso: string;
};

const EMPTY_DRAFT: DraftBundle = {
  imageUrl: "",
  prefill: null,
  caption: "",
  hashtags: [],
  platforms: ["instagram"],
  scheduleMode: "auto",
  pickIso: "",
};

export function PostComposer({ hasInstagram, hasFacebook, onScheduled }: Props) {
  const [draft, setDraft, clearDraft] = useLocalStorageState<DraftBundle>(DRAFT_KEY, EMPTY_DRAFT);

  const { imageUrl, prefill, caption, hashtags, platforms, scheduleMode, pickIso } = draft;
  const setImageUrl = (v: string) => setDraft((d) => ({ ...d, imageUrl: v }));
  const setPrefill = (v: CaptionPrefill | null) => setDraft((d) => ({ ...d, prefill: v }));
  const setCaption = (v: string) => setDraft((d) => ({ ...d, caption: v }));
  const setHashtags = (v: string[]) => setDraft((d) => ({ ...d, hashtags: v }));
  const setPlatforms = (v: SocialPlatform[]) => setDraft((d) => ({ ...d, platforms: v }));
  const setScheduleMode = (v: DraftBundle["scheduleMode"]) => setDraft((d) => ({ ...d, scheduleMode: v }));
  const setPickIso = (v: string) => setDraft((d) => ({ ...d, pickIso: v }));

  const [resetSignal, setResetSignal] = React.useState(0);
  const [prefillNonce, setPrefillNonce] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [urlError, setUrlError] = React.useState<string | null>(null);

  // Caption-form state (lifted from CaptionForm so it can drive the bottom post panel)
  const form = useForm<CaptionFormInput>({
    resolver: zodResolver(CaptionFormSchema),
    defaultValues: CAPTION_DEFAULT_VALUES,
  });
  const { reset, getValues, setValue } = form;

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [templateChecked, setTemplateChecked] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [captionVariants, setCaptionVariants] = React.useState<CaptionVariant[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CAPTION_OUTPUT_KEY);
      if (!raw) return [];
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? (j as CaptionVariant[]) : [];
    } catch {
      return [];
    }
  });

  const restoredFromLsRef = React.useRef(false);
  const lastPrefillId = React.useRef<string | null>(null);
  const lastAppliedPrefillNonceRef = React.useRef(0);
  const storedCatalogProductId = React.useRef<string | null>(null);

  // --- useFormPersist wiring for the caption form ----------------------------
  const beforeRestoreCaption = React.useCallback((parsed: Record<string, unknown>) => {
    const ta = parsed.targetAudience;
    if (Array.isArray(ta)) {
      const filtered = ta.filter((x) => typeof x === "string" && CAPTION_ALLOWED_TARGET_AUDIENCE.has(x));
      parsed.targetAudience = filtered.length ? filtered : ["women_25_35"];
    }
  }, []);

  const readCaptionSidecar = React.useCallback((parsed: Record<string, unknown>) => {
    const cid = parsed.catalogProductId;
    if (typeof cid === "string") {
      storedCatalogProductId.current = cid;
      lastPrefillId.current = cid;
    } else {
      storedCatalogProductId.current = null;
    }
  }, []);

  const validateCaptionMerged = React.useCallback((merged: CaptionFormInput) => {
    const safe = CaptionFormSchema.partial().safeParse(merged);
    if (!safe.success) return null;
    return { ...CAPTION_DEFAULT_VALUES, ...safe.data } as CaptionFormInput;
  }, []);

  const appendCaptionSave = React.useCallback(() => {
    return { catalogProductId: storedCatalogProductId.current };
  }, []);

  const { clearPersisted } = useFormPersist<CaptionFormInput>({
    key: CAPTION_DRAFT_KEY,
    watch: form.watch,
    reset,
    defaultValues: CAPTION_DEFAULT_VALUES,
    debounceMs: 500,
    beforeRestore: beforeRestoreCaption,
    readSidecar: readCaptionSidecar,
    appendToSave: appendCaptionSave,
    validateMerged: validateCaptionMerged,
    onRestored: (values) => {
      restoredFromLsRef.current = meaningfulCaptionDraft({
        ...values,
        catalogProductId: storedCatalogProductId.current,
      });
      if (String(values.productName ?? "").trim() || String(values.category ?? "").trim()) {
        setLastSaved(new Date());
      }
    },
    onSaved: () => setLastSaved(new Date()),
  });

  // --- Persist generated caption variants ------------------------------------
  React.useEffect(() => {
    try {
      if (captionVariants.length > 0) {
        window.localStorage.setItem(CAPTION_OUTPUT_KEY, JSON.stringify(captionVariants));
      } else {
        window.localStorage.removeItem(CAPTION_OUTPUT_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [captionVariants]);

  // --- Load server template when no meaningful local draft ------------------
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(CAPTION_DRAFT_KEY) : null;
        if (raw) {
          const d = JSON.parse(raw) as Partial<CaptionFormInput>;
          if (meaningfulCaptionDraft(d)) return;
        }
        const res = await fetch("/api/captions/template");
        const json = (await res.json()) as {
          success?: boolean;
          data?: { template?: { settings?: Partial<CaptionFormInput> } | null };
        };
        if (cancelled || !json.success || !json.data?.template?.settings) return;
        const s = json.data.template.settings;
        (Object.keys(s) as (keyof CaptionFormInput)[]).forEach((k) => {
          const v = s[k];
          if (v !== undefined) setValue(k, v as never, { shouldDirty: false });
        });
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  // --- Catalog prefill (from ImagePickerTabs -> handlePrefill) --------------
  function applyCatalogPrefill(p: CaptionPrefill) {
    storedCatalogProductId.current = p.id;
    const categoryLabel = p.category ?? "";
    const sc = categoryLabel ? detectProductSuperCategory(categoryLabel, p.name) : undefined;
    reset({
      ...getValues(),
      productName: p.name,
      category: categoryLabel,
      categorySuper: sc,
      categoryFields: {},
      price: typeof p.price === "number" && p.price > 0 ? p.price : getValues("price"),
      variants: Array.isArray(p.colors) ? [...p.colors] : [],
    });
  }

  React.useEffect(() => {
    if (!prefill) return;
    const catalogIntent = prefillNonce > lastAppliedPrefillNonceRef.current;

    if (!catalogIntent && lastPrefillId.current === prefill.id) return;

    if (catalogIntent) {
      lastAppliedPrefillNonceRef.current = prefillNonce;
      lastPrefillId.current = prefill.id;
      applyCatalogPrefill(prefill);
      return;
    }

    if (
      restoredFromLsRef.current &&
      prefill.id !== (storedCatalogProductId.current ?? "") &&
      meaningfulCaptionDraft(getValues())
    ) {
      lastPrefillId.current = prefill.id;
      return;
    }

    if (lastPrefillId.current === prefill.id) return;
    lastPrefillId.current = prefill.id;
    applyCatalogPrefill(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guard refs; getValues() read intentionally stale-safe
  }, [prefill, prefillNonce, reset]);

  // --- resetSignal from successful schedule: wipe caption-form too ----------
  const lastResetRef = React.useRef<number | undefined>(resetSignal);
  React.useEffect(() => {
    if (lastResetRef.current === resetSignal) return;
    lastResetRef.current = resetSignal;
    if (resetSignal === 0) return;
    clearPersisted();
    setCaptionVariants([]);
    setTemplateChecked(false);
    setLastSaved(null);
    storedCatalogProductId.current = null;
    lastPrefillId.current = null;
    lastAppliedPrefillNonceRef.current = 0;
    restoredFromLsRef.current = false;
    try {
      window.localStorage.removeItem(CAPTION_OUTPUT_KEY);
    } catch {
      /* ignore */
    }
  }, [resetSignal, clearPersisted]);

  function handleClearCaptionForm() {
    if (!window.confirm("Clear all fields and generated captions and start fresh?")) return;
    clearPersisted();
    setCaptionVariants([]);
    setLastSaved(null);
    setTemplateChecked(false);
    storedCatalogProductId.current = null;
    lastPrefillId.current = null;
    lastAppliedPrefillNonceRef.current = 0;
    restoredFromLsRef.current = false;
    try {
      window.localStorage.removeItem(CAPTION_OUTPUT_KEY);
    } catch {
      /* ignore */
    }
    toast.confirm("Form cleared");
  }

  async function handleGenerate(data: CaptionFormInput) {
    setIsGenerating(true);
    setCaptionVariants([]);
    try {
      if (templateChecked) {
        const {
          productName,
          category,
          categorySuper,
          categoryFields,
          price,
          offer,
          variants: vTags,
          usp,
          ...settings
        } = data;
        void productName;
        void category;
        void categorySuper;
        void categoryFields;
        void price;
        void offer;
        void vTags;
        void usp;
        const res = await fetch("/api/captions/template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "My default", settings }),
        });
        const j = (await res.json()) as { success?: boolean };
        if (j.success) toast.confirm("Default template saved");
      }

      const res = await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await res.json()) as {
        success?: boolean;
        data?: { variants?: CaptionVariant[] };
        error?: { code?: string; message?: string; details?: unknown };
      };

      if (!result.success) {
        if (res.status === 429) {
          toast.warning("Caption limit reached", {
            description: result.error?.message ?? "Try again in an hour.",
          });
        } else if (res.status === 400 && result.error?.details) {
          toast.error("Check the form", { description: "Fix highlighted fields." });
        } else {
          toast.error("Generation failed", {
            description: result.error?.message ?? "Please try again.",
          });
        }
        return;
      }

      const list = result.data?.variants ?? [];
      setCaptionVariants(list);
      toast.success(`${data.captionCount} caption${data.captionCount > 1 ? "s" : ""} ready`);

      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const target =
            document.getElementById("caption-variants") ?? document.getElementById("post-panel");
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch {
      toast.error("Network error", { description: "Check your connection and try again." });
    } finally {
      setIsGenerating(false);
    }
  }

  // --- Image picker + prefill ----------------------------------------------
  function handlePick(url: string) {
    setImageUrl(url);
    setUrlError(validatePostableUrl(url));
  }

  function handlePrefill(p: CaptionPrefill) {
    setPrefillNonce((n) => n + 1);
    setPrefill({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      colors: p.colors,
      sizes: p.sizes,
      fabric: p.fabric,
      occasion: p.occasion,
    });
  }

  function pickCaption(v: CaptionVariant) {
    setCaption(v.caption);
    setHashtags(v.hashtags ?? []);
  }

  async function submit(modeOverride?: DraftBundle["scheduleMode"]) {
    const effectiveMode = modeOverride ?? scheduleMode;
    if (effectiveMode !== "draft" && !hasInstagram) {
      toast.error("Connect Instagram first");
      return;
    }
    const validationError = validatePostableUrl(imageUrl);
    if (validationError) {
      setUrlError(validationError);
      toast.warning("Image required", { description: validationError });
      return;
    }
    if (!caption.trim()) {
      toast.warning("Caption required");
      return;
    }
    if (platforms.includes("facebook") && !hasFacebook) {
      toast.error("Facebook not connected");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        imageUrl: imageUrl.trim(),
        caption: caption.trim(),
        hashtags,
        platforms,
        useAutoTime: effectiveMode === "auto",
        saveAsDraft: effectiveMode === "draft",
      };
      if (effectiveMode === "draft") body.useAutoTime = false;
      if (effectiveMode === "pick") {
        if (!pickIso) {
          toast.warning("Pick a date and time");
          setSubmitting(false);
          return;
        }
        const d = new Date(pickIso);
        if (Number.isNaN(d.getTime())) {
          toast.error("Invalid date");
          setSubmitting(false);
          return;
        }
        body.scheduledFor = d.toISOString();
        body.useAutoTime = false;
      }
      if (effectiveMode === "now") body.useAutoTime = false;

      const res = await fetch("/api/social/schedule-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; post?: { id: string } };
      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Schedule failed");
      }
      if (effectiveMode === "draft") {
        toast.success("Draft saved", {
          description: "You can schedule it later from the queue.",
        });
      } else {
        toast.success("Scheduled", { description: "Your post is queued for publishing." });
      }
      clearDraft();
      setPrefillNonce(0);
      setUrlError(null);
      setResetSignal((n) => n + 1);
      onScheduled();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Schedule failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const captionLen = caption.length;
  const captionMax = 2200;
  const hasCaption = caption.trim().length > 0;

  return (
    <FormProvider {...form}>
      <div className="space-y-4 pb-8">
        {/* TOP — 2 columns: base fields (left) | advanced options (right, sticky) */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <CaptionForm
              form={form}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              lastSaved={lastSaved}
              onClear={handleClearCaptionForm}
              templateChecked={templateChecked}
              onTemplateCheckedChange={setTemplateChecked}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-4">
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="border-b border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4">
                <h3 className="text-sm font-medium text-text-primary">Advanced options</h3>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Fine-tune how the AI writes your caption
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <AdvancedOptionsPanel />
              </div>
            </div>
          </div>
        </div>

        {/* Generated captions picker — shows above the post panel so sellers
            can choose one and it auto-fills the caption field below. */}
        {captionVariants.length > 0 ? (
          <section
            id="caption-variants"
            aria-label="Generated captions"
            className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <h3 className="text-sm font-medium text-text-primary">Pick a caption</h3>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Tap one — we&apos;ll drop it into the caption field below.
                </p>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[10px] text-text-tertiary sm:text-xs">
                {captionVariants.length} {captionVariants.length === 1 ? "option" : "options"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-3">
              {captionVariants.map((v) => {
                const isActive = caption === v.caption;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => pickCaption(v)}
                    aria-pressed={isActive}
                    className={cn(
                      "group flex h-full min-h-[44px] w-full flex-col gap-2 rounded-lg border p-3 text-left transition-all",
                      isActive
                        ? "border-purple-500/60 bg-purple-500/10 ring-1 ring-purple-500/25"
                        : "border-white/[0.08] bg-black/20 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider",
                          isActive ? "text-purple-200" : "text-text-tertiary"
                        )}
                      >
                        {v.tone}
                      </span>
                      {isActive ? (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-100">
                          Selected
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100">
                          Tap to use
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        isActive ? "text-text-primary" : "text-text-secondary"
                      )}
                    >
                      {v.caption}
                    </p>
                    <span className="mt-auto text-[10px] text-text-tertiary">
                      {v.caption.length} chars
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* BOTTOM — full-width post panel */}
        <section
          id="post-panel"
          className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
        >
          <div className="border-b border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="text-sm font-medium text-text-primary">Post to social</h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Pick a caption, choose when to post, save to queue
            </p>
          </div>

          <div className="space-y-6 p-4 sm:p-5">
            <ImagePickerTabs selected={imageUrl} onPick={handlePick} onPrefill={handlePrefill} />

            {/* Caption — full width */}
            <div>
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <label htmlFor="social-caption" className="block text-xs font-medium text-text-tertiary">
                  Caption
                </label>
                {hasCaption ? (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums text-text-tertiary",
                      captionLen > 2000 && "text-amber-400/90",
                      captionLen >= captionMax && "text-red-400"
                    )}
                  >
                    {captionLen} / {captionMax}
                  </span>
                ) : null}
              </div>
              <textarea
                id="social-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                maxLength={captionMax}
                className="min-h-[140px] w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm leading-relaxed text-text-primary focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                placeholder={
                  isGenerating
                    ? "Generating captions…"
                    : captionVariants.length > 0
                      ? "Edit the selected caption or write your own…"
                      : "Write or pick from AI captions above…"
                }
              />
              {urlError ? (
                <p className="mt-1.5 text-xs text-red-300">{urlError}</p>
              ) : imageUrl ? (
                <p className="mt-1.5 truncate text-[11px] text-text-tertiary">
                  Selected image: <span className="text-text-secondary">{imageUrl}</span>
                </p>
              ) : null}
            </div>

            {/* Destinations — platforms + schedule side by side */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <PlatformSelector
                value={platforms}
                onChange={setPlatforms}
                hasInstagram={hasInstagram}
                hasFacebook={hasFacebook}
              />

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Schedule
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "auto" as const, label: "Best time (auto)" },
                      { id: "pick" as const, label: "Pick date & time" },
                      { id: "now" as const, label: "Post now" },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScheduleMode(opt.id)}
                      className={cn(
                        "min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:min-h-0",
                        scheduleMode === opt.id
                          ? "border-purple-500/50 bg-purple-500/10 text-purple-100"
                          : "border-white/[0.08] text-text-secondary hover:border-white/20"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {scheduleMode === "pick" ? (
                  <Input
                    type="datetime-local"
                    value={pickIso}
                    onChange={(e) => setPickIso(e.target.value)}
                    className="mt-1 max-w-xs"
                  />
                ) : null}
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void submit("draft")}
                disabled={submitting}
                className="min-h-[44px] gap-2 sm:min-h-9 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="min-h-[44px] gap-2 bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-60 sm:min-h-9 sm:w-auto"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Save to queue
              </Button>
            </div>
          </div>
        </section>
      </div>
    </FormProvider>
  );
}
