import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export interface AuthFieldProps extends InputProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  error?: string;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon: Icon, hint, error, className, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className={cn("w-full", className)}>
        <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
          {label}
        </label>
        <div
          className={cn(
            "group mt-2 flex items-center gap-3 border-b pb-2.5 transition-colors",
            error ? "border-error" : "border-border-strong focus-within:border-brand",
            !error && "hover:border-border-default"
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0 text-text-tertiary transition-colors group-focus-within:text-brand" />
          <input
            id={inputId}
            ref={ref}
            className="w-full min-w-0 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-tertiary/80"
            {...props}
          />
        </div>
        {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
        {!error && hint ? <p className="mt-1.5 text-xs text-text-tertiary">{hint}</p> : null}
      </div>
    );
  }
);
AuthField.displayName = "AuthField";

export function AuthSelect({
  label,
  icon: Icon,
  children,
  className,
  id,
  ...props
}: React.ComponentProps<"select"> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const autoId = React.useId();
  const selectId = id ?? autoId;

  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        {label}
      </label>
      <div className="group relative mt-2 flex items-center gap-3 border-b border-border-strong pb-2.5 transition-colors focus-within:border-brand hover:border-border-default">
        <Icon className="h-[18px] w-[18px] shrink-0 text-text-tertiary transition-colors group-focus-within:text-brand" />
        <select
          id={selectId}
          className="w-full cursor-pointer appearance-none bg-transparent py-0.5 pr-8 text-[15px] text-text-primary outline-none"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
      </div>
    </div>
  );
}
