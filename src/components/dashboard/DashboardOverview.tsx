"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Camera,
  ImageIcon,
  Layers,
  MessageCircle,
  PenLine,
  Share2,
  Zap,
} from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard-stats";
import { cn } from "@/lib/utils";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const quickTools = [
  {
    label: "Photo Studio",
    desc: "AI-powered product photos",
    href: "/photo-studio",
    icon: Camera,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/20",
    live: true,
  },
  {
    label: "Social Posts",
    desc: "Auto-generate & schedule",
    href: "#",
    icon: Share2,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/20",
    live: false,
  },
  {
    label: "WhatsApp Bot",
    desc: "24/7 automated orders",
    href: "#",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    live: false,
  },
  {
    label: "Title Optimizer",
    desc: "SEO-perfect listings",
    href: "#",
    icon: PenLine,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    live: false,
  },
];

export function DashboardOverview({ stats, userName }: { stats: DashboardStats; userName: string }) {
  const maxBar = Math.max(1, ...stats.last7Days.map((d) => d.count));
  const totalWeek = stats.last7Days.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Here&apos;s what&apos;s happening with your store today.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Processed",
            value: stats.totalProcessed,
            sub: "Total images",
            icon: ImageIcon,
            accent: "text-purple-400",
            accentBg: "bg-purple-500/10",
          },
          {
            label: "In Queue",
            value: stats.inQueue,
            sub: "Pending now",
            icon: Layers,
            accent: "text-amber-400",
            accentBg: "bg-amber-500/10",
          },
          {
            label: "Active",
            value: stats.activeBatches,
            sub: "Batches running",
            icon: Activity,
            accent: "text-emerald-400",
            accentBg: "bg-emerald-500/10",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-200 hover:border-white/[0.1] hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.accentBg)}>
                  <Icon className={cn("h-4 w-4", s.accent)} />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-text-primary">
                {s.value}
              </div>
              <p className="mt-0.5 text-xs text-text-tertiary">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Activity chart + Quick actions row */}
      <div className="grid gap-3 lg:grid-cols-5">
        {/* Chart — takes 3 cols */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Weekly activity</h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {totalWeek > 0 ? `${totalWeek} images this week` : "No activity yet"}
              </p>
            </div>
            <Link
              href="/photo-studio"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-white/[0.14] hover:text-text-primary"
            >
              Open Studio
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-6">
            <div className="flex h-[140px] items-end gap-2">
              {stats.last7Days.map((day) => {
                const pct = maxBar > 0 ? Math.round((day.count / maxBar) * 100) : 0;
                const barH = day.count === 0 ? 4 : Math.max(10, pct);
                return (
                  <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-[110px] w-full max-w-[44px] flex-col justify-end">
                      <div
                        className={cn(
                          "w-full rounded-md transition-all duration-500",
                          day.count === 0
                            ? "bg-white/[0.04]"
                            : "bg-gradient-to-t from-brand/80 to-brand/30"
                        )}
                        style={{ height: `${barH}%` }}
                        title={`${day.count} images`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-text-tertiary">{day.label}</span>
                  </div>
                );
              })}
            </div>
            {stats.last7Days.every((d) => d.count === 0) && (
              <p className="mt-4 text-center text-[13px] text-text-tertiary">
                Upload your first batch in{" "}
                <Link href="/photo-studio" className="font-medium text-brand hover:underline">
                  Photo Studio
                </Link>{" "}
                to see activity here.
              </p>
            )}
          </div>
        </div>

        {/* Quick actions — takes 2 cols */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-text-primary">Quick actions</h2>
            <p className="mt-0.5 text-xs text-text-tertiary">Jump into your tools</p>
            <div className="mt-4 space-y-2">
              {quickTools.map((tool) => {
                const Icon = tool.icon;
                const inner = (
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150",
                      tool.live
                        ? "cursor-pointer hover:bg-white/[0.04]"
                        : "cursor-default opacity-50"
                    )}
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", tool.bg, tool.ring)}>
                      <Icon className={cn("h-4 w-4", tool.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-text-primary">{tool.label}</span>
                        {!tool.live && (
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary">{tool.desc}</p>
                    </div>
                    {tool.live && (
                      <ArrowRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                );
                return tool.live ? (
                  <Link key={tool.label} href={tool.href}>{inner}</Link>
                ) : (
                  <div key={tool.label}>{inner}</div>
                );
              })}
            </div>
          </div>

          {/* Pro tip */}
          <div className="relative overflow-hidden rounded-xl border border-brand/15 bg-brand/[0.04] p-4">
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand/10 blur-2xl" aria-hidden />
            <div className="relative flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15">
                <Zap className="h-3.5 w-3.5 text-brand" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-text-primary">Pro tip</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">
                  Upload 50+ images at once for best results. AI works better in batches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
