"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [pct, setPct] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const updatePct = React.useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const val = Math.round(((clientX - rect.left) / rect.width) * 100);
    setPct(Math.max(0, Math.min(100, val)));
  }, []);

  React.useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragging.current) return;
      e.preventDefault();
      updatePct(e.clientX);
    }
    function onPointerUp() { dragging.current = false; }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [updatePct]);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    e.preventDefault();
    updatePct(e.clientX);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") setPct((p) => Math.max(0, p - 2));
    if (e.key === "ArrowRight") setPct((p) => Math.min(100, p + 2));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full touch-none overflow-hidden rounded-lg ring-1 ring-white/[0.06] select-none"
      tabIndex={0}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Before and after comparison"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    >
      {/* After (generated) fills the frame; "before" is clipped on top so left = before, right = after (matches labels).
          Clip is applied directly to the <img> so both images render through the same paint path —
          wrapping the before in an extra clipped <div> causes Chromium to rasterize that sublayer and
          show it noticeably softer than the after image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterUrl}
        alt="After"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        style={{ imageRendering: "auto" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt="Before"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, imageRendering: "auto" }}
      />

      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm">Before</span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm">After</span>

      <div
        className="absolute top-0 z-10 h-full w-0.5 bg-white/50"
        style={{ left: `${pct}%` }}
      />
      <button
        type="button"
        className={cn(
          "absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-[10px] font-bold text-white shadow-md backdrop-blur-sm"
        )}
        style={{ left: `calc(${pct}% - 16px)` }}
        aria-label="Drag to compare"
        onPointerDown={(e) => { e.stopPropagation(); dragging.current = true; }}
      >
        ↔
      </button>
    </div>
  );
}
