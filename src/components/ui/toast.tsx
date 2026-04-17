"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastRecord = ToastInput & { id: string };

const ToastStateContext = React.createContext<{
  push: (t: ToastInput) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const push = React.useCallback((t: ToastInput) => {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    setToasts((prev) => [...prev, { ...t, id }].slice(-3));
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastPrimitive.Provider duration={4000} swipeDirection="right">
      <ToastStateContext.Provider value={{ push }}>{children}</ToastStateContext.Provider>

      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={cn(
            "group pointer-events-auto relative flex w-[min(420px,calc(100vw-2rem))] items-start justify-between gap-3 rounded-lg border bg-bg-surface p-4 shadow-lg",
            t.variant === "success" && "border-success/30 border-l-4 border-l-success",
            t.variant === "error" && "border-error/30 border-l-4 border-l-error",
            t.variant === "warning" && "border-warning/30 border-l-4 border-l-warning",
            (!t.variant || t.variant === "info") && "border-info/30 border-l-4 border-l-info"
          )}
        >
          <div>
            <ToastPrimitive.Title className="text-sm font-semibold text-text-primary">
              {t.title}
            </ToastPrimitive.Title>
            {t.description ? (
              <ToastPrimitive.Description className="mt-1 text-sm text-text-secondary">
                {t.description}
              </ToastPrimitive.Description>
            ) : null}
          </div>
          <ToastPrimitive.Close className="rounded-md px-2 py-1 text-xs text-text-tertiary hover:bg-bg-hover hover:text-text-primary">
            Close
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}

      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[1200] flex max-h-screen w-[min(420px,calc(100vw-1rem))] flex-col-reverse gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastStateContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  const { push } = ctx;
  // Stable identity so effects that list `toast` in deps (e.g. fetch on mount) do not loop forever.
  return React.useMemo(
    () => ({
      show: push,
      success: (title: string, description?: string) =>
        push({ title, description, variant: "success" }),
      error: (title: string, description?: string) =>
        push({ title, description, variant: "error" }),
      warning: (title: string, description?: string) =>
        push({ title, description, variant: "warning" }),
      info: (title: string, description?: string) =>
        push({ title, description, variant: "info" }),
    }),
    [push]
  );
}
