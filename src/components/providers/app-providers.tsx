"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      storageKey="growthos-theme"
      disableTransitionOnChange={false}
    >
      <SessionProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
