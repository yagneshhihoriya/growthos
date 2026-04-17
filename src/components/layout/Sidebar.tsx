"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  HelpCircle,
  Home,
  Link2,
  MessageCircle,
  PartyPopper,
  PenLine,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { GrowthLogoWordmark } from "@/components/branding/GrowthLogo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  featureClass?: string;
  soon?: boolean;
};

const overview: NavItem[] = [{ href: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> }];

const tools: NavItem[] = [
  {
    href: "/photo-studio",
    label: "Photo Studio",
    icon: <Camera className="h-5 w-5" />,
    featureClass: "text-feature-photo",
  },
  {
    href: "/social-posts",
    label: "Social Posts",
    icon: <Share2 className="h-5 w-5" />,
    featureClass: "text-feature-social",
  },
  {
    href: "#",
    label: "WhatsApp Bot",
    icon: <MessageCircle className="h-5 w-5" />,
    featureClass: "text-feature-whatsapp",
    soon: true,
  },
  {
    href: "#",
    label: "Title Optimizer",
    icon: <PenLine className="h-5 w-5" />,
    featureClass: "text-feature-titles",
    soon: true,
  },
  {
    href: "#",
    label: "Festival Calendar",
    icon: <PartyPopper className="h-5 w-5" />,
    featureClass: "text-feature-festival",
    soon: true,
  },
  {
    href: "#",
    label: "Review Automator",
    icon: <Sparkles className="h-5 w-5" />,
    featureClass: "text-feature-reviews",
    soon: true,
  },
  {
    href: "#",
    label: "Price Tracker",
    icon: <TrendingUp className="h-5 w-5" />,
    featureClass: "text-feature-prices",
    soon: true,
  },
];

const account: NavItem[] = [
  { href: "/profile", label: "Settings", icon: <Settings className="h-5 w-5" /> },
  { href: "#", label: "Connections", icon: <Link2 className="h-5 w-5" />, soon: true },
  { href: "#", label: "Help", icon: <HelpCircle className="h-5 w-5" />, soon: true },
];

function NavButton({
  item,
  active,
  collapsed,
  onSoon,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onSoon: () => void;
}) {
  const content = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-white/[0.06] font-medium text-text-primary"
          : "text-text-secondary",
        item.soon ? "cursor-not-allowed opacity-50" : "hover:bg-white/[0.04] hover:text-text-primary"
      )}
    >
      <span className={cn("shrink-0", active && !item.featureClass ? "text-brand" : "", item.featureClass)}>{item.icon}</span>
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {!collapsed && item.soon ? (
        <span className="ml-auto rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
          Soon
        </span>
      ) : null}
    </span>
  );

  if (item.soon) {
    const inner = collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="w-full text-left" onClick={onSoon}>
            {content}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    ) : (
      <button type="button" className="w-full text-left" onClick={onSoon}>
        {content}
      </button>
    );
    return <div className="w-full">{inner}</div>;
  }

  const link = (
    <Link href={item.href} className="block w-full">
      {content}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const { data } = useSession();
  const toast = useToast();

  const widthClass = collapsed ? "w-[64px]" : "w-[240px]";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-[500] flex h-dvh flex-col border-r border-white/[0.06] bg-[#0d0d0f] transition-[width] duration-300 ease-spring",
        widthClass
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-3">
        <Link href="/dashboard" className="min-w-0 flex-1 px-1 transition-opacity hover:opacity-80">
          <GrowthLogoWordmark collapsed={collapsed} />
        </Link>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className={cn("px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary", collapsed && "sr-only")}>
          Overview
        </div>
        <div className="space-y-1">
          {overview.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={pathname === item.href}
              collapsed={collapsed}
              onSoon={() => toast.info("Coming in Phase 2 🚀")}
            />
          ))}
        </div>

        <div className={cn("mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary", collapsed && "sr-only")}>
          Tools
        </div>
        <div className="space-y-1">
          {tools.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={!item.soon && pathname.startsWith(item.href)}
              collapsed={collapsed}
              onSoon={() => toast.info("Coming in Phase 2 🚀")}
            />
          ))}
        </div>

        <div className={cn("mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary", collapsed && "sr-only")}>
          Account
        </div>
        <div className="space-y-1">
          {account.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={!item.soon && pathname.startsWith(item.href)}
              collapsed={collapsed}
              onSoon={() => toast.info("Coming in Phase 2 🚀")}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className={cn("flex items-center gap-2 rounded-md px-1 py-2", collapsed && "justify-center")}>
          <Avatar className="h-9 w-9">
            {data?.user?.image ? (
              <AvatarImage src={data.user.image} alt={data.user.name ?? "Seller"} />
            ) : null}
            <AvatarFallback>{(data?.user?.name ?? "S").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-primary">{data?.user?.name ?? "Seller"}</div>
              <div className="truncate text-xs text-text-tertiary">Free plan</div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
