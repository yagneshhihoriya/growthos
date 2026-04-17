"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface Breadcrumb { label: string; href?: string }

function breadcrumbsFromPath(pathname: string | null): { title: string; breadcrumbs: Breadcrumb[] } {
  if (!pathname) return { title: "Dashboard", breadcrumbs: [{ label: "Dashboard" }] };

  if (pathname.startsWith("/photo-studio")) {
    return {
      title: "Photo Studio",
      breadcrumbs: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Photo Studio" },
      ],
    };
  }
  if (pathname.startsWith("/profile")) {
    return {
      title: "My profile",
      breadcrumbs: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "My profile" },
      ],
    };
  }
  if (pathname.startsWith("/dashboard")) {
    return { title: "Dashboard", breadcrumbs: [{ label: "Dashboard" }] };
  }
  return { title: "GrowthOS", breadcrumbs: [{ label: "GrowthOS" }] };
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("growthos.sidebar.collapsed");
      if (raw === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("growthos.sidebar.collapsed", collapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [collapsed]);

  const marginClass = collapsed ? "ml-[64px]" : "ml-[240px]";
  const { title, breadcrumbs } = breadcrumbsFromPath(pathname);

  return (
    <div className="min-h-dvh bg-bg-base">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <div className={`${marginClass} min-h-dvh transition-[margin] duration-300 ease-spring`}>
        <TopBar title={title} sidebarLeftPx={collapsed ? 64 : 240} breadcrumbs={breadcrumbs} />
        <main className="min-h-[calc(100dvh-56px)] bg-[#0a0a0a] px-6 pb-10 pt-[calc(56px+1.75rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
