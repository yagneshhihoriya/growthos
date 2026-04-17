import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[12px] border border-border-subtle bg-bg-surface shadow-none ring-1 ring-[var(--card-ring)]",
  {
    variants: {
      hoverable: {
        true: "transition-colors duration-150 hover:border-border-default",
        false: "",
      },
      padding: {
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
    },
    defaultVariants: {
      hoverable: false,
      padding: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, hoverable, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ hoverable, padding }), className)} {...props} />;
}
