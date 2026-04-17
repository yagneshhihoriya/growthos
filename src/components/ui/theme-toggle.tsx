"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-[72px] shrink-0 rounded-full bg-bg-elevated" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-[72px] shrink-0 rounded-full p-1 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-strong"
      style={{
        background: "var(--theme-toggle-track)",
        border: "1px solid var(--border-default)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
        <Sun
          size={14}
          className="transition-colors duration-300"
          style={{ color: isDark ? "var(--text-tertiary)" : "var(--text-primary)" }}
        />
        <Moon
          size={14}
          className="transition-colors duration-300"
          style={{ color: isDark ? "var(--text-primary)" : "var(--text-tertiary)" }}
        />
      </div>

      <motion.div
        className="relative flex h-7 w-7 items-center justify-center rounded-full border border-border-default shadow-sm"
        style={{ background: "var(--toggle-thumb)" }}
        initial={false}
        animate={{ x: isDark ? 0 : 36 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              className="flex items-center justify-center text-zinc-800"
              initial={{ opacity: 0, rotate: -30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 30 }}
              transition={{ duration: 0.15 }}
            >
              <Moon size={14} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              className="flex items-center justify-center text-white"
              initial={{ opacity: 0, rotate: 30 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -30 }}
              transition={{ duration: 0.15 }}
            >
              <Sun size={14} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

/** Icon-only cycle (dark ↔ light); for compact spaces like the sidebar footer. */
export function ThemeToggleIcon({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("h-9 w-9 shrink-0 rounded-md bg-bg-elevated", className)} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-default text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
