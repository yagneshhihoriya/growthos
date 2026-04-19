"use client";

import * as React from "react";
import type { FieldValues, UseFormReset, UseFormWatch } from "react-hook-form";

function pickFormKeys<T extends FieldValues>(defaults: T, raw: Record<string, unknown>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(defaults) as (keyof T)[]) {
    if (Object.prototype.hasOwnProperty.call(raw, k) && raw[k as string] !== undefined) {
      (out as Record<string, unknown>)[k as string] = raw[k as string];
    }
  }
  return out;
}

export interface UseFormPersistOptions<T extends FieldValues> {
  key: string;
  watch: UseFormWatch<T>;
  reset: UseFormReset<T>;
  defaultValues: T;
  exclude?: (keyof T)[];
  debounceMs?: number;
  onRestored?: (values: T) => void;
  onSaved?: () => void;
  /** Run on parsed localStorage before merge (e.g. sanitize nested fields). */
  beforeRestore?: (raw: Record<string, unknown>) => void;
  /** Extra keys merged into JSON on save (debounced). */
  appendToSave?: (values: Partial<T>) => Record<string, unknown>;
  /** Set refs from non-form keys after parse. */
  readSidecar?: (raw: Record<string, unknown>) => void;
  /** If provided, return null to skip restore (corrupt draft). */
  validateMerged?: (merged: T) => T | null;
}

export function useFormPersist<T extends FieldValues>({
  key,
  watch,
  reset,
  defaultValues,
  exclude = [],
  debounceMs = 500,
  onRestored,
  onSaved,
  beforeRestore,
  appendToSave,
  readSidecar,
  validateMerged,
}: UseFormPersistOptions<T>) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoredRef = React.useRef(false);
  const defaultsRef = React.useRef(defaultValues);
  defaultsRef.current = defaultValues;

  const clearPersisted = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    reset(defaultsRef.current);
  }, [key, reset]);

  React.useLayoutEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Record<string, unknown>;
      beforeRestore?.(parsed);
      readSidecar?.(parsed);

      const picked = pickFormKeys(defaultsRef.current, parsed);
      let merged = { ...defaultsRef.current, ...picked } as T;
      for (const field of exclude) {
        (merged as Record<string, unknown>)[field as string] = (defaultsRef.current as Record<string, unknown>)[
          field as string
        ];
      }

      if (validateMerged) {
        const ok = validateMerged(merged);
        if (!ok) {
          window.localStorage.removeItem(key);
          return;
        }
        merged = ok;
      }

      reset(merged);
      onRestored?.(merged);
    } catch {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }, [beforeRestore, key, onRestored, readSidecar, reset, validateMerged, exclude]);

  React.useEffect(() => {
    const subscription = watch((values) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          const base = { ...(values as Record<string, unknown>) };
          for (const field of exclude) {
            delete base[field as string];
          }
          const extra = appendToSave?.(values as Partial<T>) ?? {};
          window.localStorage.setItem(key, JSON.stringify({ ...base, ...extra }));
          onSaved?.();
        } catch {
          /* quota / private mode */
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [appendToSave, debounceMs, exclude, key, onSaved, watch]);

  return { clearPersisted };
}
