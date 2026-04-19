"use client";

import { cn } from "@/lib/utils";

export function SkeletonTitleResult({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4",
        className
      )}
      aria-hidden
    >
      <div className="mb-3 flex gap-2">
        <div className="h-4 w-24 rounded bg-white/[0.08]" />
        <div className="h-4 w-16 rounded-full bg-white/[0.06]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/[0.06]" />
        <div className="h-3 w-[92%] rounded bg-white/[0.06]" />
        <div className="h-3 w-[70%] rounded bg-white/[0.06]" />
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-1/3 rounded-full bg-purple-500/25" />
      </div>
    </div>
  );
}
