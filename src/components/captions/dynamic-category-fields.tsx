"use client";

import * as React from "react";
import { Controller, type Control } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { PillSelector } from "@/components/ui/pill-selector";
import { FabricMaterialField } from "@/components/ui/fabric-material-field";
import {
  CAPTION_EXTRA_FIELDS_BY_GROUP,
  type CategoryField,
} from "@/lib/caption-categories";
import type { CaptionFormInput } from "@/lib/schemas/caption";
import type { SuperCategory } from "@/lib/title-pipeline";

type Props = {
  superCategory: SuperCategory | null | undefined;
  categoryLabel?: string;
  control: Control<CaptionFormInput>;
};

export function DynamicCategoryFields({ superCategory, categoryLabel, control }: Props) {
  const fields = superCategory ? CAPTION_EXTRA_FIELDS_BY_GROUP[superCategory] ?? [] : [];
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary/70">
          {categoryLabel ? `${categoryLabel} details` : "Category details"}
        </p>
        <span className="text-[10px] text-text-tertiary/70">(optional — helps the AI be specific)</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.name}
            className={
              field.type === "tags" || field.type === "pills" || field.type === "fabric"
                ? "sm:col-span-2"
                : undefined
            }
          >
            <label className="mb-1.5 block text-xs font-medium text-text-tertiary">
              {field.label}
            </label>

            <Controller
              name={`categoryFields.${field.name}` as never}
              control={control}
              render={({ field: rhf }) => <FieldControl field={field} rhf={rhf} />}
            />

            {field.hint ? (
              <p className="mt-1 text-[11px] text-text-tertiary/70">{field.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

type RhfFieldLike = {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  name: string;
};

function FieldControl({ field, rhf }: { field: CategoryField; rhf: RhfFieldLike }) {
  if (field.type === "tags") {
    const arr = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
    return (
      <TagInput
        value={arr}
        onChange={(next) => rhf.onChange(next)}
        placeholder={field.placeholder ?? "Type and press Enter…"}
      />
    );
  }

  if (field.type === "pills") {
    const arr = Array.isArray(rhf.value) ? (rhf.value as string[]) : [];
    return (
      <PillSelector
        multi
        aria-label={field.label}
        options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
        value={arr}
        onChange={(next) => rhf.onChange(next)}
      />
    );
  }

  if (field.type === "fabric") {
    const str = typeof rhf.value === "string" ? rhf.value : "";
    return <FabricMaterialField value={str} onChange={(next) => rhf.onChange(next)} />;
  }

  if (field.type === "number") {
    const num =
      typeof rhf.value === "number"
        ? rhf.value
        : typeof rhf.value === "string" && rhf.value !== ""
          ? Number(rhf.value)
          : "";
    return (
      <Input
        type="number"
        inputMode="numeric"
        value={num === 0 ? "" : num}
        onChange={(e) => {
          const v = e.target.value;
          rhf.onChange(v === "" ? undefined : Number(v));
        }}
        onBlur={rhf.onBlur}
        placeholder={field.placeholder}
        rightSlot={field.unit ? <span className="text-xs text-text-tertiary">{field.unit}</span> : undefined}
      />
    );
  }

  const str = typeof rhf.value === "string" ? rhf.value : "";
  return (
    <Input
      value={str}
      onChange={(e) => rhf.onChange(e.target.value)}
      onBlur={rhf.onBlur}
      placeholder={field.placeholder}
    />
  );
}
