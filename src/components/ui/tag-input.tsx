"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  maxTags = 20,
  className,
}: TagInputProps) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Tab" && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div
      role="group"
      aria-label="Color and variant tags"
      className={cn(
        "flex min-h-10 cursor-text flex-wrap gap-1.5 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 transition-colors",
        "focus-within:border-emerald-500/35",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-xs text-text-secondary"
        >
          {tag}
          <button
            type="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                removeTag(i);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="inline-flex h-9 min-w-[36px] items-center justify-center rounded text-text-tertiary transition-colors hover:text-red-400 sm:h-7 sm:min-w-0"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-[5rem] flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary/70"
      />
    </div>
  );
}
