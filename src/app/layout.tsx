import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "GrowthOS",
  description: "India's smartest seller toolkit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-bg-base text-text-primary">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
