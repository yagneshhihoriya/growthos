import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-white shadow-brand-glow hover:bg-brand-hover hover:shadow-brand-glow active:shadow-brand disabled:shadow-none",
        secondary:
          "bg-bg-elevated border border-border-default text-text-primary hover:bg-bg-overlay",
        ghost: "bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
        danger:
          "bg-error-muted border border-error/25 text-error hover:bg-error/20",
        "brand-outline":
          "border border-brand/30 text-brand bg-brand-muted hover:bg-[color-mix(in_srgb,var(--brand)_16%,var(--bg-base))]",
        /** Premium CTA — auth & marketing (gradient + soft inner highlight) */
        primaryShine:
          "border-0 bg-gradient-to-b from-brand via-brand to-brand-hover text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),var(--shadow-brand-glow)] hover:brightness-[1.05] active:brightness-[0.98]",
      },
      size: {
        sm: "h-7 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      iconLeft,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={Boolean(disabled || loading)}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight ? iconRight : null}
      </button>
    );
  }
);
Button.displayName = "Button";
