import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leftSlot, rightSlot, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className={cn("w-full", className)}>
        {label ? (
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-text-primary">
            {label}
          </label>
        ) : null}

        <div className="relative">
          {leftSlot ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {leftSlot}
            </div>
          ) : null}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "h-9 w-full rounded-md border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary",
              "border-border-default focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-white/10",
              error ? "border-error/50 focus:border-error/50 focus:ring-error/20" : "",
              leftSlot ? "pl-10" : "",
              rightSlot ? "pr-10" : ""
            )}
            {...props}
          />
          {rightSlot ? (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {rightSlot}
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
        {!error && hint ? <p className="mt-1 text-xs text-text-tertiary">{hint}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
