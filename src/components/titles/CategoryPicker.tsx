"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  allCategoryOptions,
  SUPER_CATEGORY_LABELS,
  SUPER_CATEGORY_ORDER,
} from "@/lib/title-optimizer-categories";
import type { SuperCategory } from "@/lib/title-pipeline";

const CATEGORY_OPTIONS = allCategoryOptions();

export function CategoryPicker({
  value,
  onChange,
  detectedSuperCategory,
  placeholder,
  label = "Category *",
  showDetected = true,
}: {
  value: string;
  onChange: (label: string, superCategory: SuperCategory | null) => void;
  detectedSuperCategory?: SuperCategory;
  placeholder?: string;
  label?: string;
  showDetected?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? CATEGORY_OPTIONS.filter((o) => o.label.toLowerCase().includes(q))
      : CATEGORY_OPTIONS;
    const byGroup = new Map<SuperCategory, string[]>();
    for (const o of matches) {
      const list = byGroup.get(o.group) ?? [];
      list.push(o.label);
      byGroup.set(o.group, list);
    }
    return SUPER_CATEGORY_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      label: SUPER_CATEGORY_LABELS[g],
      items: byGroup.get(g) ?? [],
    }));
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs text-text-tertiary">{label}</label>
      <Input
        value={open ? query : value}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          onChange(v, null);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        className="mt-1"
        placeholder={placeholder ?? "Search or type category (e.g. Kurti, Mobile Phone, Face Cream)…"}
        role="combobox"
        aria-expanded={open}
      />
      {open && grouped.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-white/[0.1] bg-[#141416] py-1 shadow-lg">
          {grouped.map((grp) => (
            <li key={grp.group}>
              <div className="sticky top-0 bg-[#141416] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                {grp.label}
              </div>
              <ul>
                {grp.items.map((lbl) => (
                  <li key={`${grp.group}-${lbl}`}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/[0.06]"
                      onClick={() => {
                        onChange(lbl, grp.group);
                        setQuery(lbl);
                        setOpen(false);
                      }}
                    >
                      {lbl}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
      {showDetected && value.trim() && detectedSuperCategory ? (
        <p className="mt-1 text-[11px] text-text-tertiary">
          Detected:{" "}
          <span className="font-medium text-text-secondary">
            {SUPER_CATEGORY_LABELS[detectedSuperCategory]}
          </span>
        </p>
      ) : null}
    </div>
  );
}
