import type { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerVariant = "warning" | "info" | "success" | "error";

interface AlertBannerProps {
  variant: BannerVariant;
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const variantConfig: Record<
  BannerVariant,
  {
    icon: ReactNode;
    containerClass: string;
    textClass: string;
    actionClass: string;
  }
> = {
  warning: {
    icon: <AlertTriangle size={15} />,
    containerClass:
      "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100",
    textClass: "text-amber-900 dark:text-amber-100",
    actionClass: "text-amber-800 dark:text-amber-200",
  },
  info: {
    icon: <Info size={15} />,
    containerClass:
      "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
    textClass: "text-blue-900 dark:text-blue-100",
    actionClass: "text-blue-800 dark:text-blue-200",
  },
  success: {
    icon: <CheckCircle size={15} />,
    containerClass:
      "bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-100",
    textClass: "text-teal-900 dark:text-teal-100",
    actionClass: "text-teal-800 dark:text-teal-200",
  },
  error: {
    icon: <XCircle size={15} />,
    containerClass:
      "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
    textClass: "text-red-900 dark:text-red-100",
    actionClass: "text-red-800 dark:text-red-200",
  },
};

export function AlertBanner({ variant, message, action, className }: AlertBannerProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        config.containerClass,
        className
      )}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <span className={cn("flex-1", config.textClass)}>{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "flex-shrink-0 text-xs font-medium underline underline-offset-2",
            config.actionClass
          )}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
