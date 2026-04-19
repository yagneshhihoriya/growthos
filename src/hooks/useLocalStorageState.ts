"use client";

import * as React from "react";

/**
 * useLocalStorageState — drop-in replacement for `useState` that transparently
 * persists the value to `localStorage` under the given key.
 *
 * SSR-safe: the initial render uses `initial` on both server and client so there
 * is no hydration mismatch. On mount, a single effect reads localStorage and
 * swaps in the stored value (if any). Subsequent state changes write back.
 *
 * Typical use: draft form fields that the user shouldn't lose on accidental refresh.
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = React.useState<T>(initial);
  const hydratedRef = React.useRef(false);

  // IMPORTANT — order matters.
  //
  // Effects in the same component run in source order. The persist effect MUST
  // be declared before the hydrate effect so that, on first mount:
  //   1. Persist runs first with `hydratedRef.current === false` and bails out.
  //   2. Hydrate runs, reads localStorage, calls setState, flips the ref.
  //   3. The setState from step 2 schedules a re-render; on that render the
  //      persist effect sees the new state value in its closure and writes it.
  //
  // If we flipped the order, step 1 would write the *initial* state back to
  // localStorage (its closure captured the pre-hydrate value), nuking the
  // draft we just read. Silent data loss — the exact bug we had before.
  React.useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private-mode — best-effort only */
    }
  }, [key, state]);

  // Hydrate from localStorage exactly once on mount.
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setState(parsed);
      }
    } catch {
      /* corrupt JSON, ignore and keep initial */
    } finally {
      hydratedRef.current = true;
    }
  }, [key]);

  // Keep a stable ref to `initial` so `clear` can reset without retriggering
  // when callers inline a fresh array/object literal each render.
  const initialRef = React.useRef(initial);
  const clear = React.useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setState(initialRef.current);
  }, [key]);

  return [state, setState, clear];
}
