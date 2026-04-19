import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
};

export const toast = {
  success: (title: string, options?: ToastOptions) =>
    sonnerToast.success(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    }),

  error: (title: string, options?: ToastOptions) =>
    sonnerToast.error(title, {
      description: options?.description,
      duration: options?.duration ?? 6000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    }),

  warning: (title: string, options?: ToastOptions) =>
    sonnerToast.warning(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    }),

  info: (title: string, options?: ToastOptions) =>
    sonnerToast.info(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    }),

  confirm: (title: string) => sonnerToast(title, { duration: 2000 }),

  persistent: (title: string, options?: ToastOptions) =>
    sonnerToast.warning(title, {
      description: options?.description,
      duration: Infinity,
      action: options?.action
        ? { label: options.action.label, onClick: options.action.onClick }
        : undefined,
    }),

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),

  /** Async flows — only `src/lib/toast.ts` may call sonner for loading state. */
  loading: (message: string) => sonnerToast.loading(message),
};
