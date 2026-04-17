import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full font-medium", {
  variants: {
    variant: {
      default: "bg-[var(--badge-bg)] text-[var(--badge-fg)] border border-[var(--badge-border)]",
      success: "bg-success-muted text-success border border-success/25",
      warning: "bg-warning-muted text-warning border border-warning/25",
      error: "bg-error-muted text-error border border-error/25",
      brand: "bg-brand-muted text-brand border border-brand-border",
      "feature-photo":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-photo)_12%,var(--bg-elevated))] text-feature-photo",
      "feature-social":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-social)_12%,var(--bg-elevated))] text-feature-social",
      "feature-whatsapp":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-whatsapp)_12%,var(--bg-elevated))] text-feature-whatsapp",
      "feature-titles":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-titles)_12%,var(--bg-elevated))] text-feature-titles",
      "feature-festival":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-festival)_12%,var(--bg-elevated))] text-feature-festival",
      "feature-reviews":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-reviews)_12%,var(--bg-elevated))] text-feature-reviews",
      "feature-prices":
        "border border-border-default bg-[color-mix(in_srgb,var(--feature-prices)_12%,var(--bg-elevated))] text-feature-prices",
    },
    size: {
      sm: "text-[10px] px-1.5 py-0.5",
      md: "text-xs px-2 py-0.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
