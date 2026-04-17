import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: "default" | "success" | "warning" | "error" | "striped";
}

export function Progress({
  className,
  value,
  max = 100,
  showLabel,
  variant = "default",
  ...props
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  const barClass =
    variant === "striped"
      ? "bg-brand animate-pulse"
      : variant === "success"
        ? "bg-success"
        : variant === "warning"
          ? "bg-warning"
          : variant === "error"
            ? "bg-error"
            : "bg-brand";

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-spring", barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <div className="mt-1 text-right text-xs text-text-tertiary">{pct}%</div>
      ) : null}
    </div>
  );
}
