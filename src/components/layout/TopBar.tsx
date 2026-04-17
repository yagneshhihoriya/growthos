"use client";

import * as React from "react";
import { Bell, ChevronRight, LogOut, Search, UserRound } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Breadcrumb {
  label: string;
  href?: string;
}

export function TopBar({
  title,
  sidebarLeftPx,
  breadcrumbs,
}: {
  title: string;
  sidebarLeftPx: number;
  breadcrumbs?: Breadcrumb[];
}) {
  const { data } = useSession();
  const user = data?.user;

  const crumbs: Breadcrumb[] = breadcrumbs ?? [{ label: title }];

  return (
    <header
      className="fixed right-0 top-0 z-[400] h-14 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl transition-[left] duration-300 ease-spring"
      style={{ left: sidebarLeftPx }}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-[13px]" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.label}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-text-tertiary" />}
              {crumb.href ? (
                <Link href={crumb.href} className="font-medium text-text-tertiary transition-colors hover:text-text-secondary">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-text-secondary">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 text-xs text-text-tertiary transition-colors hover:border-white/[0.1] hover:text-text-secondary"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="ml-2 hidden rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
          </button>

          <div className="mx-1 h-5 w-px bg-white/[0.06]" />

          <button
            type="button"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-text-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-lg p-1 transition-colors hover:bg-white/[0.04]"
                aria-label="Account menu"
              >
                <Avatar className="h-7 w-7">
                  {user?.image ? <AvatarImage src={user.image} alt={user.name ?? "Seller"} /> : null}
                  <AvatarFallback className="bg-white/[0.06] text-[11px] font-semibold text-text-secondary">
                    {(user?.name ?? "S").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border border-white/[0.08] bg-[#141416]">
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-text-primary">{user?.name}</div>
                <div className="text-[11px] text-text-tertiary">{user?.email}</div>
              </div>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-[13px]">
                    <UserRound className="h-3.5 w-3.5" />
                    Profile & Settings
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                className="cursor-pointer text-red-400 focus:text-red-400"
                onSelect={() => void signOut({ callbackUrl: "/login" })}
              >
                <span className="inline-flex items-center gap-2 text-[13px]">
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
