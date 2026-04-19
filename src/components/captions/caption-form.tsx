"use client";

import * as React from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import { TagInput } from "@/components/ui/tag-input";
import { PillSelector } from "@/components/ui/pill-selector";
import { CaptionCategorySelect } from "@/components/captions/category-select";
import { DynamicCategoryFields } from "@/components/captions/dynamic-category-fields";
import { type CaptionFormInput } from "@/lib/schemas/caption";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const CAPTION_DRAFT_KEY = "growthos:caption-form:v2";
export const CAPTION_OUTPUT_KEY = "growthos:caption-generated-variants:v1";

export const CAPTION_DEFAULT_VALUES: CaptionFormInput = {
  productName: "",
  category: "",
  categorySuper: undefined,
  categoryFields: {},
  price: 0,
  offer: "",
  variants: [],
  platform: "instagram",
  language: "hinglish",
  tone: "casual",
  targetAudience: ["women_25_35"],
  usp: "",
  cta: "dm",
  captionLength: "medium",
  hashtagMode: "full",
  captionCount: 3,
};

export const CAPTION_ALLOWED_TARGET_AUDIENCE = new Set<string>([
  "women_18_24",
  "women_25_35",
  "women_35_plus",
  "men",
  "mothers",
  "budget_buyers",
  "gifting",
]);

export type CaptionDraftWithSidecar = CaptionFormInput & { catalogProductId?: string | null };

export function meaningfulCaptionDraft(d: Partial<CaptionDraftWithSidecar>): boolean {
  return Boolean(
    String(d.productName ?? "").trim() ||
      String(d.category ?? "").trim() ||
      (Array.isArray(d.variants) && d.variants.length > 0) ||
      (typeof d.price === "number" && d.price > 0)
  );
}

const LENGTH_LABEL: Record<string, string> = { short: "Short", medium: "Medium", long: "Long" };
const LANGUAGE_LABEL: Record<string, string> = { hinglish: "Hinglish", hindi: "Hindi", english: "English" };

interface CaptionFormProps {
  form: UseFormReturn<CaptionFormInput>;
  isGenerating: boolean;
  onGenerate: (data: CaptionFormInput) => Promise<void> | void;
  lastSaved: Date | null;
  onClear: () => void;
  templateChecked: boolean;
  onTemplateCheckedChange: (v: boolean) => void;
}

export function CaptionForm({
  form,
  isGenerating,
  onGenerate,
  lastSaved,
  onClear,
  templateChecked,
  onTemplateCheckedChange,
}: CaptionFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchedLanguage = watch("language");
  const watchedLength = watch("captionLength");
  const watchedCategory = watch("category");
  const watchedSuper = watch("categorySuper");

  const summaryLabel = `3 captions · ${LENGTH_LABEL[watchedLength]} · ${LANGUAGE_LABEL[watchedLanguage]}`;

  return (
    <form onSubmit={handleSubmit(onGenerate)} noValidate className="max-w-full">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
        {isGenerating ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/40 px-6 backdrop-blur-[1px]"
            aria-busy
            aria-live="polite"
          >
            <Loader2 className="h-9 w-9 shrink-0 animate-spin text-emerald-400" />
            <p className="text-center text-sm text-text-secondary">Writing captions…</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400/90" />
            <span className="text-sm font-medium text-text-primary">AI captions</span>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">
              Beta
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 sm:text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {lastSaved ? "Draft saved" : "Draft"}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-text-tertiary underline decoration-text-tertiary/40 underline-offset-2 transition-colors hover:text-text-secondary sm:text-xs"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div id="caption-field-product" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="caption-productName" className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Product name <span className="text-red-400">*</span>
              </label>
              <Controller
                name="productName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="caption-productName"
                    placeholder="e.g. Silk Kurti, iPhone Case…"
                    error={errors.productName?.message}
                  />
                )}
              />
            </div>
            <div>
              <label htmlFor="caption-category" className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Category <span className="text-red-400">*</span>
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <CaptionCategorySelect
                    id="caption-category"
                    value={field.value}
                    error={errors.category?.message}
                    onChange={(label, sc) => {
                      field.onChange(label);
                      setValue("categorySuper", sc ?? undefined, { shouldDirty: true });
                      setValue("categoryFields", {}, { shouldDirty: true });
                    }}
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
                Offer / discount <span className="font-normal text-text-tertiary/60">(optional)</span>
              </label>
              <Controller
                name="offer"
                control={control}
                render={({ field }) => <Input {...field} placeholder="e.g. 30% off till Sunday" />}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
              Colors / variants <span className="font-normal text-text-tertiary/60">(Enter to add)</span>
            </label>
            <Controller
              name="variants"
              control={control}
              render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
            />
          </div>

          {watchedSuper ? (
            <>
              <div className="h-px bg-white/[0.06]" />
              <DynamicCategoryFields
                superCategory={watchedSuper}
                categoryLabel={watchedCategory}
                control={control}
              />
            </>
          ) : null}

          <div className="h-px bg-white/[0.06]" />

          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-tertiary/70">
              Platform & language
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-text-tertiary">Primary platform</label>
                <Controller
                  name="platform"
                  control={control}
                  render={({ field }) => (
                    <PillSelector
                      aria-label="Primary platform"
                      options={[
                        { value: "instagram", label: "Instagram" },
                        { value: "facebook", label: "Facebook" },
                        { value: "both", label: "Both" },
                        { value: "whatsapp", label: "WhatsApp" },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-tertiary">Language</label>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <PillSelector
                      aria-label="Caption language"
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
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-text-tertiary">
            <input
              type="checkbox"
              checked={templateChecked}
              onChange={(e) => onTemplateCheckedChange(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/[0.2] bg-black/30 text-emerald-500 focus:ring-emerald-500/40"
            />
            Save as my default template
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[10px] text-text-tertiary sm:text-xs">
              {summaryLabel}
            </span>
            <Button
              type="submit"
              accessKey="g"
              disabled={isGenerating}
              className="min-h-[44px] gap-2 bg-emerald-600 px-4 text-white hover:bg-emerald-500 disabled:opacity-60 sm:min-h-9"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "Generating…" : "Generate captions"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
