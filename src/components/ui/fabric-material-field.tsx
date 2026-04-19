"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { COMMON_FABRIC_PRESETS } from "@/lib/fabric-presets";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-white/[0.1] bg-black/30 px-3 text-sm text-text-primary " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20";

type Props = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

/** Preset dropdown fills the text field; you can still edit or type anything in the input. */
export function FabricMaterialField({ value, onChange, className }: Props) {
  const presetId = React.useId();

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-stretch", className)}>
      <div className="w-full shrink-0 sm:max-w-[220px]">
        <label htmlFor={presetId} className="sr-only">
          Pick a common fabric
        </label>
        <select
          id={presetId}
          defaultValue=""
          aria-label="Common fabric presets"
          onChange={(e) => {
            const v = e.target.value;
            if (v) onChange(v);
            e.currentTarget.selectedIndex = 0;
          }}
          className={selectClass}
        >
          <option value="">Common fabrics…</option>
          {COMMON_FABRIC_PRESETS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1"
        placeholder="e.g. 100% cotton, georgette with lining…"
      />
    </div>
  );
}
