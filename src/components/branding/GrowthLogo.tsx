"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** App mark — orange gradient tile + spark icon */
export function GrowthLogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] shadow-md shadow-orange-900/40 ring-1 ring-orange-400/20",
        box,
        className
      )}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      <Sparkles className={cn("relative text-white drop-shadow-sm", icon)} strokeWidth={2.25} />
    </div>
  );
}

export function GrowthLogoWordmark({
  collapsed,
  className,
}: {
  collapsed: boolean;
  className?: string;
}) {
  if (collapsed) {
    return (
      <div className={cn("flex min-w-0 flex-1 items-center justify-center", className)}>
        <GrowthLogoMark size="sm" />
      </div>
    );
  }
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <GrowthLogoMark size="md" />
      <div className="min-w-0 leading-tight">
        <div className="text-sm font-extrabold tracking-tight text-text-primary">GrowthOS</div>
        <div className="text-[10px] font-medium text-text-tertiary">Seller toolkit</div>
      </div>
    </div>
  );
}
