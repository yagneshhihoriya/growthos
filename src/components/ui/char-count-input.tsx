"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaRest = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "maxLength">;
type InputRest = Omit<React.InputHTMLAttributes<HTMLInputElement>, "maxLength">;

function CountFooter({
  len,
  maxLength,
  warnAt,
}: {
  len: number;
  maxLength: number;
  warnAt: number;
}) {
  const warn = len >= warnAt;
  const over = len > maxLength;
  return (
    <div className="flex justify-end pt-1">
      <span
        className={cn(
          "text-[11px] tabular-nums text-text-tertiary",
          warn && !over && "text-amber-400/90",
          over && "text-red-400"
        )}
      >
        {len} / {maxLength}
      </span>
    </div>
  );
}

export function CharCountTextarea({
  maxLength,
  warnAt = Math.floor(maxLength * 0.9),
  value = "",
  className,
  ...props
}: TextareaRest & { maxLength: number; warnAt?: number }) {
  const len = String(value).length;
  const over = len > maxLength;
  return (
    <div>
      <textarea
        maxLength={maxLength}
        value={value}
        className={cn(className, over && "border-red-500/40")}
        {...props}
      />
      <CountFooter len={len} maxLength={maxLength} warnAt={warnAt} />
    </div>
  );
}

export function CharCountLineInput({
  maxLength,
  warnAt = Math.floor(maxLength * 0.9),
  value = "",
  className,
  ...props
}: InputRest & { maxLength: number; warnAt?: number }) {
  const len = String(value).length;
  const over = len > maxLength;
  return (
    <div>
      <input
        maxLength={maxLength}
        value={value}
        className={cn(className, over && "border-red-500/40")}
        {...props}
      />
      <CountFooter len={len} maxLength={maxLength} warnAt={warnAt} />
    </div>
  );
}
