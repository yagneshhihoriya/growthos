"use client";

import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

export function MetaButton({
  disabled,
  appearance = "default",
}: {
  disabled?: boolean;
  appearance?: "default" | "dark" | "light";
}) {
  const isDark = appearance === "dark";
  const isLight = appearance === "light";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void signIn("facebook", { callbackUrl: "/dashboard" })}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm font-semibold transition-all",
        "disabled:pointer-events-none disabled:opacity-50",
        isDark
          ? "border border-white/[0.08] bg-white/[0.04] text-neutral-200 hover:border-[#1877F2]/35 hover:bg-[#1877F2]/10"
          : isLight
            ? "border border-gray-200 bg-white text-gray-900 shadow-sm hover:border-[#1877F2]/40 hover:bg-[#f8fafc] hover:shadow-md"
            : "border border-[color-mix(in_srgb,var(--oauth-meta-bg)_45%,var(--border-default))] bg-[color-mix(in_srgb,var(--oauth-meta-bg)_18%,var(--bg-elevated))] text-text-primary shadow-sm hover:bg-[color-mix(in_srgb,var(--oauth-meta-bg)_28%,var(--bg-elevated))]"
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", isDark ? "text-[#8ab4f8]" : "text-[#1877F2]")}>
        <path
          fill="currentColor"
          d="M22 12a10 10 0 1 0-11.5 9.9v-7H7V12h3.5V9.8c0-3.5 2.1-5.4 5.3-5.4 1.5 0 3.1.3 3.1.3v3.4h-1.7c-1.7 0-2.2 1-2.2 2.1V12h3.8l-.6 3.9h-3.2v7A10 10 0 0 0 22 12z"
        />
      </svg>
      <span className={isDark ? "text-neutral-200" : isLight ? "text-gray-900" : "text-text-primary"}>Facebook</span>
    </button>
  );
}
