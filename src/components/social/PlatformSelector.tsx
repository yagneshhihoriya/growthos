"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SocialPlatform = "instagram" | "facebook";

export function PlatformSelector({
  value,
  onChange,
  hasInstagram,
  hasFacebook,
}: {
  value: SocialPlatform[];
  onChange: (next: SocialPlatform[]) => void;
  hasInstagram: boolean;
  hasFacebook: boolean;
}) {
  function toggle(p: SocialPlatform) {
    if (p === "instagram" && !hasInstagram) return;
    if (p === "facebook" && !hasFacebook) return;
    if (value.includes(p)) {
      const next = value.filter((x) => x !== p);
      onChange(next.length ? next : [p]);
    } else {
      onChange([...value, p]);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Platforms</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasInstagram}
          onClick={() => toggle("instagram")}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            value.includes("instagram")
              ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
              : "border-white/[0.08] text-text-secondary hover:border-white/[0.14]",
            !hasInstagram && "cursor-not-allowed opacity-40"
          )}
        >
          Instagram
        </button>
        <button
          type="button"
          disabled={!hasFacebook}
          onClick={() => toggle("facebook")}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            value.includes("facebook")
              ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
              : "border-white/[0.08] text-text-secondary hover:border-white/[0.14]",
            !hasFacebook && "cursor-not-allowed opacity-40"
          )}
        >
          Facebook
        </button>
      </div>
    </div>
  );
}
