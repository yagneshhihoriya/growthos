"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { PillSelector } from "@/components/ui/pill-selector";
import { CharCountLineInput } from "@/components/ui/char-count-input";
import type { CaptionFormInput } from "@/lib/schemas/caption";

const SAMPLE_PREVIEWS: Record<string, string> = {
  hinglish:
    "✨ Yeh kurti sirf kapda nahi — yeh ek feeling hai. Maroon aur Gold ki is khubsurat combination mein apni vibe dhundho. Sirf ₹499 mein, free COD available! DM us to order 🛍️",
  hindi:
    "✨ यह कुर्ती सिर्फ कपड़ा नहीं — यह एक एहसास है। मैरून और गोल्ड की खूबसूरत जोड़ी में अपना स्टाइल खोजें। सिर्फ ₹499 में, फ्री COD उपलब्ध! ऑर्डर करने के लिए DM करें 🛍️",
  english:
    "✨ This isn't just a kurti — it's a vibe. Find your style in this stunning Maroon & Gold combination. Just ₹499 with free COD. DM us to order 🛍️",
};

/**
 * Always-visible advanced-options card (companion to CaptionForm).
 * Reads form state via {@link useFormContext}; must be rendered inside a
 * `<FormProvider>` that wraps the same `UseFormReturn<CaptionFormInput>`
 * instance used by the base form.
 */
export function AdvancedOptionsPanel() {
  const { control, watch } = useFormContext<CaptionFormInput>();
  const watchedLanguage = watch("language");

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
          What makes it special?{" "}
          <span className="font-normal text-text-tertiary/60">(optional — 1 line the AI will highlight)</span>
        </label>
        <Controller
          name="usp"
          control={control}
          render={({ field }) => (
            <CharCountLineInput
              maxLength={300}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              placeholder="e.g. Handloom by rural artisans, Smudge-proof 24hrs, Pure cotton…"
              className="h-9 min-h-[44px] w-full rounded-md border border-border-default bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-purple-500/35 focus:outline-none focus:ring-1 focus:ring-purple-500/20 sm:min-h-9"
            />
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-text-tertiary">Call to action</label>
        <Controller
          name="cta"
          control={control}
          render={({ field }) => (
            <PillSelector
              aria-label="Call to action"
              options={[
                { value: "dm", label: "DM to order" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "link_in_bio", label: "Link in bio" },
                { value: "shop_now", label: "Shop now" },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-text-tertiary">Caption length</label>
        <Controller
          name="captionLength"
          control={control}
          render={({ field }) => (
            <PillSelector
              variant="card"
              aria-label="Caption length"
              options={[
                { value: "short", label: "Short", sub: "1–3 lines" },
                { value: "medium", label: "Medium", sub: "4–6 lines" },
                { value: "long", label: "Long", sub: "Story style" },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-text-tertiary">Hashtags</label>
        <Controller
          name="hashtagMode"
          control={control}
          render={({ field }) => (
            <PillSelector
              variant="card"
              aria-label="Hashtag mode"
              options={[
                { value: "full", label: "Include", sub: "15–20 tags" },
                { value: "minimal", label: "Minimal", sub: "5 tags" },
                { value: "none", label: "None", sub: "No hashtags" },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary/70">
          Sample output preview
        </p>
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="text-xs italic leading-relaxed text-text-secondary">
            {SAMPLE_PREVIEWS[watchedLanguage] ?? SAMPLE_PREVIEWS.hinglish}
          </p>
          <p className="mt-2 text-[10px] text-purple-300/80">#KurtiLover #IndianFashion …</p>
        </div>
      </div>
    </div>
  );
}
