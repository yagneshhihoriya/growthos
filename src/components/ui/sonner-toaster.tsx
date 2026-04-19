"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "toast-base",
          title: "toast-title",
          description: "toast-description",
          actionButton: "toast-action",
          cancelButton: "toast-cancel",
          closeButton: "toast-close",
        },
      }}
    />
  );
}
