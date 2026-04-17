"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MessageCircle,
  PartyPopper,
  Send,
  Sparkles,
  Star,
  TrendingDown,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeatureDef = {
  id: string;
  accent: string;
  dotClass: string;
  badge: string;
  heading: string;
  body: string;
  benefits: string[];
  cta: string;
  visual: "photo" | "social" | "whatsapp" | "titles" | "festival" | "reviews" | "prices";
};

export const LANDING_FEATURES: FeatureDef[] = [
  {
    id: "photo-studio",
    accent: "text-feature-photo",
    dotClass: "bg-feature-photo",
    badge: "Photo Studio",
    heading: "Professional product photos. No studio needed.",
    body: "Upload raw phone photos. Our AI removes backgrounds, enhances quality, and exports perfectly sized images for every marketplace — in bulk, in minutes.",
    benefits: [
      "Background removal in 1 click",
      "Auto-resize for Amazon, Meesho, Flipkart",
      "Process 100 photos in under 2 minutes",
    ],
    cta: "Try Photo Studio free →",
    visual: "photo",
  },
  {
    id: "social",
    accent: "text-feature-social",
    dotClass: "bg-feature-social",
    badge: "Auto Social Posts",
    heading: "Post every day without touching your phone.",
    body: "AI writes captions in Hindi, Hinglish, or English. Schedule 30 days of Instagram and Facebook posts in one sitting. Platform posts automatically.",
    benefits: ["AI captions in your language", "Best-time auto-scheduling", "30-day autopilot calendar"],
    cta: "Join waitlist →",
    visual: "social",
  },
  {
    id: "whatsapp",
    accent: "text-feature-whatsapp",
    dotClass: "bg-feature-whatsapp",
    badge: "WhatsApp Sales Bot",
    heading: "Your 24/7 salesperson on WhatsApp.",
    body: "Never miss a customer query again. Our AI bot handles price questions, size queries, COD confirmations, and even takes orders — at 2am when you're asleep.",
    benefits: ["Understands Hinglish & shorthand", "Auto follow-up sequences", "Order collection without your involvement"],
    cta: "Join waitlist →",
    visual: "whatsapp",
  },
  {
    id: "titles",
    accent: "text-feature-titles",
    dotClass: "bg-feature-titles",
    badge: "AI Title Optimizer",
    heading: "Move from page 8 to page 1.",
    body: "AI generates SEO-optimised titles for Amazon, Flipkart, and Meesho. Keyword research, competitor analysis, and A/B testing — all built in.",
    benefits: ["Platform-specific character limits", "Competitor title analysis", "Bulk CSV processing for 100 products"],
    cta: "Join waitlist →",
    visual: "titles",
  },
  {
    id: "festival",
    accent: "text-feature-festival",
    dotClass: "bg-feature-festival",
    badge: "Festival Calendar",
    heading: "Always 15 days ahead of every festival.",
    body: "Get alerts before Navratri, Diwali, Eid, and 20+ more festivals. Start posting content and restocking before your competition even notices the season.",
    benefits: ["30-20-15-7-2 day alert system", "Auto-generated festival content", "Stock warning system"],
    cta: "Join waitlist →",
    visual: "festival",
  },
  {
    id: "reviews",
    accent: "text-feature-reviews",
    dotClass: "bg-feature-reviews",
    badge: "Review Automator",
    heading: "5-star reviews on autopilot.",
    body: "Smart routing sends happy customers to public review pages. Unhappy customers get private resolution before they can damage your ratings.",
    benefits: ["Post-delivery WhatsApp sequences", "Smart happy/unhappy routing", "Review-to-social content converter"],
    cta: "Join waitlist →",
    visual: "reviews",
  },
  {
    id: "prices",
    accent: "text-feature-prices",
    dotClass: "bg-feature-prices",
    badge: "Price Tracker",
    heading: "Know what your competitors charge. Every morning.",
    body: "Daily intelligence report on competitor pricing. Instant alerts when they drop prices. 90-day history charts to spot their strategy.",
    benefits: ["Real-time price drop alerts", "AI pricing recommendations", "Competitor product launch alerts"],
    cta: "Join waitlist →",
    visual: "prices",
  },
];

function featureById(id: string): FeatureDef {
  const f = LANDING_FEATURES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown feature ${id}`);
  return f;
}

const bentoMotion = { type: "spring" as const, stiffness: 420, damping: 32 };

function BentoCard({
  className,
  children,
  glowClass,
}: {
  className?: string;
  children: React.ReactNode;
  glowClass?: string;
}) {
  return (
    <motion.div
      className={cn(
        "group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-orange-500/[0.07] before:to-transparent before:opacity-0 before:transition-opacity before:duration-500",
        "hover:before:opacity-100",
        glowClass,
        className
      )}
      whileHover={{ scale: 1.012, y: -2 }}
      transition={bentoMotion}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      {children}
    </motion.div>
  );
}

function CardHeader({ icon: Icon, badge, accent }: { icon: React.ElementType; badge: string; accent: string }) {
  return (
    <div className="relative z-[1] mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-orange-400 shadow-inner">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className={cn("text-xs font-bold uppercase tracking-[0.14em]", accent)}>{badge}</span>
      </div>
    </div>
  );
}

function VisualContentCalendar() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      setPhase(1);
      return;
    }
    const id = window.setInterval(() => setPhase((p) => (p + 1) % 2), 3800);
    return () => window.clearInterval(id);
  }, [reduce]);

  const raw = "New kurta listing — plain description text only.";
  const hinglish = "Naya kurta drop hai yaar — full festive vibe ✨🔥 #suratsilk #meeshofinds";

  return (
    <div className="relative z-[1] mt-auto">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {["Mon 14", "Tue 15", "Wed 16"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-white/[0.07] bg-black/20 px-2 py-2.5 text-center shadow-inner sm:py-3"
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider text-orange-300/90">{label}</div>
            <Calendar className="mx-auto mt-1.5 h-4 w-4 text-orange-400/70" />
          </div>
        ))}
      </div>
      <div className="relative mt-3 min-h-[4.5rem] rounded-xl border border-white/[0.06] bg-black/25 p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn("pr-16 text-left text-[11px] leading-snug sm:text-xs", phase === 0 ? "text-zinc-400" : "text-cyan-100/95")}
          >
            {phase === 0 ? <span className="font-medium text-zinc-500">Raw text</span> : null}
            <div className={cn("mt-1", phase === 0 ? "text-zinc-500" : "font-medium text-zinc-100")}>{phase === 0 ? raw : hinglish}</div>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {phase === 1 ? (
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-orange-400/35 bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-200"
            >
              <Clock className="h-3 w-3" />
              Scheduled
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function VisualWhatsAppDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      setStep(4);
      return;
    }
    const id = window.setInterval(() => setStep((s) => ((s + 1) % 5)), 850);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative z-[1] mt-auto flex min-h-[220px] flex-col rounded-xl border border-white/[0.08] bg-[#0a0a0c] shadow-inner">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        </div>
        <span className="ml-2 text-[10px] font-semibold text-zinc-500">WhatsApp Business</span>
        <MessageCircle className="ml-auto h-3.5 w-3.5 text-emerald-400/80" />
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        {step >= 1 ? (
          <motion.div
            key="user-msg"
            initial={reduce ? false : { opacity: 0, x: 16, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm border border-white/[0.08] bg-zinc-800/90 px-3 py-2 text-[11px] text-zinc-100 shadow-lg"
          >
            Bhai price kya hai?
          </motion.div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[10px] text-zinc-600">Live demo…</div>
        )}

        {step >= 2 ? (
          <motion.div
            key="typing"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 pl-1"
          >
            <Bot className="h-4 w-4 shrink-0 text-orange-400" />
            <span className="text-[10px] text-zinc-500">GrowthOS is typing…</span>
          </motion.div>
        ) : null}

        {step >= 3 ? (
          <motion.div
            key="product"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="max-w-[92%] rounded-2xl rounded-tl-sm border border-emerald-500/20 bg-emerald-950/40 p-2.5 shadow-lg"
          >
            <div className="flex gap-2">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-violet-500/40 to-orange-500/30 ring-1 ring-white/10" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold text-zinc-200">Cotton Blue Kurta</div>
                <div className="mt-0.5 text-sm font-bold text-emerald-300">₹599</div>
                <div className="mt-1 text-[10px] text-zinc-400">COD + XL available. Tap to order.</div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {step >= 4 ? (
          <motion.div
            key="order"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Order confirmed
          </motion.div>
        ) : null}
      </div>
      <div className="border-t border-white/[0.06] bg-black/30 px-3 py-2">
        <p className="text-center text-[10px] leading-relaxed text-zinc-500">
          <span className="font-semibold text-orange-300/90">&ldquo;Saves me 2 hours daily!&rdquo;</span> — Meena, Bhiwandi
        </p>
      </div>
    </div>
  );
}

function VisualTitleOptimizer() {
  return (
    <div className="relative z-[1] mt-auto space-y-3">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="relative rounded-xl border-l-4 border-l-red-500/90 bg-red-950/25 p-3 pr-24 shadow-inner"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/90">Before</span>
          <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-red-200">22</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-red-100/90">Blue Kurta</p>
        <p className="mt-1 text-[10px] text-red-300/60">Low search score · buried on page 8</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="relative rounded-xl border-l-4 border-l-emerald-500/90 bg-emerald-950/25 p-3 shadow-inner"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">After</span>
          <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-emerald-200">94</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-emerald-50">
          Premium Cotton Blue Kurta for Women — Office Wear
        </p>
        <p className="mt-1 text-[10px] text-emerald-300/70">SEO-optimised · marketplace-safe length</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200"
      >
        <Sparkles className="h-3 w-3" />
        Saved 15 minutes
      </motion.div>
    </div>
  );
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function useCountdown(target: Date) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (now === null) return { d: 0, h: 0, m: 0, s: 0, ready: false };
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  return { d, h, m, s, ready: true };
}

function VisualFestivalTimeline() {
  const reduce = useReducedMotion();
  const navratri = React.useMemo(() => new Date("2026-10-12T18:00:00+05:30"), []);
  const diwali = React.useMemo(() => new Date("2026-11-08T18:00:00+05:30"), []);
  const n = useCountdown(navratri);
  const d = useCountdown(diwali);

  return (
    <div className="relative z-[1] mt-auto">
      <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-orange-500/50 via-white/10 to-fuchsia-500/40" />
      <div className="space-y-5 pl-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative rounded-xl border border-white/[0.08] bg-black/25 p-3 shadow-inner"
        >
          <div className="absolute -left-[22px] top-3 flex h-5 w-5 items-center justify-center rounded-full border border-orange-400/40 bg-orange-500/20">
            <PartyPopper className="h-3 w-3 text-orange-300" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-zinc-100">Navratri</span>
            <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">
              Stock alert
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] tabular-nums text-orange-200/90">
            {n.ready ? (
              <>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{n.d}d</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(n.h)}h</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(n.m)}m</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(n.s)}s</span>
              </>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="mt-3 w-full rounded-lg border border-orange-500/35 bg-orange-500/15 py-2 text-[11px] font-bold uppercase tracking-wide text-orange-100 transition-colors hover:bg-orange-500/25"
          >
            Generate ad
          </motion.button>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06 }}
          className="relative rounded-xl border border-white/[0.08] bg-black/25 p-3 shadow-inner"
        >
          <div className="absolute -left-[22px] top-3 flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15">
            <Sparkles className="h-3 w-3 text-amber-200" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-zinc-100">Diwali</span>
            <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-200">
              Campaign
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] tabular-nums text-amber-100/90">
            {d.ready ? (
              <>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{d.d}d</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(d.h)}h</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(d.m)}m</span>
                <span className="rounded-md bg-white/[0.06] px-2 py-1">{pad2(d.s)}s</span>
              </>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="mt-3 w-full rounded-lg border border-amber-400/30 bg-amber-500/10 py-2 text-[11px] font-bold uppercase tracking-wide text-amber-50 transition-colors hover:bg-amber-500/20"
          >
            Generate ad
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function VisualReviewStack() {
  const reduce = useReducedMotion();
  const [pulse, setPulse] = React.useState(0);
  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setPulse((p) => p + 1), 3200);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative z-[1] mt-auto min-h-[190px]">
      <div className="relative mx-auto max-w-[280px] pt-1">
        <motion.div
          key={`g-${pulse}`}
          animate={reduce ? {} : { y: [0, -3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-[2] rounded-xl border border-emerald-500/30 bg-emerald-950/55 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-emerald-100">5-star review posted to Google</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-200/70">Happy customer · public listing boosted</p>
        </motion.div>
        <motion.div
          className="relative z-[3] -mt-3 translate-y-1 rounded-xl border border-amber-500/30 bg-amber-950/55 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
          animate={reduce ? {} : { y: [0, 2, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-amber-300" />
            <span className="text-[11px] font-bold text-amber-100">Negative feedback → private chat</span>
          </div>
          <p className="mt-1 text-[10px] text-amber-200/75">Routed before it hits your public rating</p>
        </motion.div>
        <div className="pointer-events-none absolute -bottom-1 left-6 right-6 z-[1] h-10 rounded-xl border border-white/[0.05] bg-zinc-900/50 opacity-80" />
      </div>
    </div>
  );
}

function VisualPriceGraph() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const [drawKey, setDrawKey] = React.useState(0);

  const pathD = "M 4 18 C 28 22, 52 38, 76 48 S 124 62, 148 68 S 180 78, 196 82";

  React.useEffect(() => {
    if (!hovered || reduce) return;
    setDrawKey((k) => k + 1);
    const id = window.setInterval(() => setDrawKey((k) => k + 1), 2200);
    return () => window.clearInterval(id);
  }, [hovered, reduce]);

  return (
    <div
      className="relative z-[1] mt-auto rounded-xl border border-white/[0.07] bg-black/30 p-3 shadow-inner"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <span className="flex items-center gap-1 text-teal-300/90">
          <TrendingDown className="h-3.5 w-3.5" />
          Competitor price
        </span>
        <span className="text-orange-300/80">Live</span>
      </div>
      <svg viewBox="0 0 200 88" className="w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="priceStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(45 212 191)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(249 115 22)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`${pathD} L 196 88 L 4 88 Z`}
          fill="url(#priceFill)"
          initial={false}
          animate={{ opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.35 }}
        />
        <motion.path
          key={drawKey}
          d={pathD}
          fill="none"
          stroke="url(#priceStroke)"
          strokeWidth={hovered ? 3 : 2.2}
          strokeLinecap="round"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: hovered && !reduce ? 1.25 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <AnimatePresence>
        {hovered ? (
          <motion.div
            key={drawKey}
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 460, damping: 26 }}
            className="pointer-events-none absolute bottom-7 left-1/2 z-10 w-[92%] max-w-[220px] -translate-x-1/2 rounded-lg border border-orange-400/35 bg-orange-950/92 px-3 py-2 text-center shadow-[0_8px_32px_rgba(249,115,22,0.28)] backdrop-blur-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-orange-200">GrowthOS alert</p>
            <p className="mt-0.5 text-[11px] font-semibold text-zinc-100">Price matched</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {!hovered ? (
        <p className="mt-1 text-center text-[10px] text-zinc-500">Hover to replay the line and alert</p>
      ) : null}
    </div>
  );
}

function VisualPhotoStudio() {
  return (
    <div className="relative z-[1] mt-auto grid grid-cols-2 gap-2">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex flex-col rounded-xl border border-white/[0.07] bg-zinc-900/50 p-2.5 shadow-inner"
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Before</span>
        <div className="mt-2 flex flex-1 items-center justify-center">
          <div className="h-16 w-14 rounded-md bg-gradient-to-br from-amber-200/25 to-zinc-600/40 ring-1 ring-white/10" />
        </div>
        <span className="mt-2 text-[10px] text-zinc-500">Phone snap</span>
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="flex flex-col rounded-xl border border-orange-500/20 bg-gradient-to-b from-orange-500/10 to-transparent p-2.5 shadow-inner"
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-orange-300/90">After</span>
        <div className="mt-2 flex flex-1 items-center justify-center">
          <div className="relative h-16 w-14 rounded-md bg-white shadow-md ring-1 ring-white/20">
            <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-orange-400/80" />
          </div>
        </div>
        <span className="mt-2 text-[10px] text-orange-200/80">Marketplace ready</span>
      </motion.div>
    </div>
  );
}

export function LandingFeaturesSection() {
  const photo = featureById("photo-studio");
  const social = featureById("social");
  const wa = featureById("whatsapp");
  const titles = featureById("titles");
  const fest = featureById("festival");
  const rev = featureById("reviews");
  const prices = featureById("prices");

  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-border-subtle bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(249,115,22,0.12),transparent_55%),var(--bg-base)] py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
            Everything a seller needs.
            <br />
            <span className="bg-gradient-to-r from-orange-300 via-amber-200 to-orange-400 bg-clip-text text-transparent">
              Bento-grade product visuals.
            </span>
          </h2>
          <p className="mt-4 text-sm text-text-secondary md:text-base">
            Interactive previews — hover, scroll, and feel the polish. Built with motion and glass, tuned for dark mode.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto_auto]">
          {/* Row 1: Photo + Social */}
          <BentoCard className="group lg:col-span-4 lg:row-span-1">
            <CardHeader icon={Camera} badge={photo.badge} accent={photo.accent} />
            <h3 className="relative z-[1] text-lg font-bold tracking-tight text-text-primary md:text-xl">{photo.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">{photo.body}</p>
            <VisualPhotoStudio />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="primary" className="w-full sm:w-auto">
                  {photo.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          <BentoCard className="group lg:col-span-8">
            <CardHeader icon={Calendar} badge={social.badge} accent={social.accent} />
            <h3 className="relative z-[1] text-lg font-bold tracking-tight text-text-primary md:text-xl">{social.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-2 text-sm text-text-secondary">{social.body}</p>
            <VisualContentCalendar />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {social.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          {/* Row 2: WhatsApp + Titles */}
          <BentoCard className="group lg:col-span-6">
            <CardHeader icon={MessageCircle} badge={wa.badge} accent={wa.accent} />
            <h3 className="relative z-[1] text-lg font-bold tracking-tight text-text-primary md:text-xl">{wa.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-2 text-sm text-text-secondary">{wa.body}</p>
            <VisualWhatsAppDemo />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {wa.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          <BentoCard className="group lg:col-span-6">
            <CardHeader icon={Wand2} badge={titles.badge} accent={titles.accent} />
            <h3 className="relative z-[1] text-lg font-bold tracking-tight text-text-primary md:text-xl">{titles.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-2 text-sm text-text-secondary">{titles.body}</p>
            <VisualTitleOptimizer />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {titles.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          {/* Row 3: Festival + Reviews + Prices */}
          <BentoCard className="group lg:col-span-4">
            <CardHeader icon={PartyPopper} badge={fest.badge} accent={fest.accent} />
            <h3 className="relative z-[1] text-base font-bold tracking-tight text-text-primary md:text-lg">{fest.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-3 text-xs leading-relaxed text-text-secondary sm:text-sm">{fest.body}</p>
            <VisualFestivalTimeline />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" size="sm" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {fest.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          <BentoCard className="group lg:col-span-4">
            <CardHeader icon={Star} badge={rev.badge} accent={rev.accent} />
            <h3 className="relative z-[1] text-base font-bold tracking-tight text-text-primary md:text-lg">{rev.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-2 text-xs text-text-secondary sm:text-sm">{rev.body}</p>
            <VisualReviewStack />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" size="sm" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {rev.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>

          <BentoCard className="group lg:col-span-4">
            <CardHeader icon={TrendingDown} badge={prices.badge} accent={prices.accent} />
            <h3 className="relative z-[1] text-base font-bold tracking-tight text-text-primary md:text-lg">{prices.heading}</h3>
            <p className="relative z-[1] mt-2 line-clamp-2 text-xs text-text-secondary sm:text-sm">{prices.body}</p>
            <VisualPriceGraph />
            <div className="relative z-[1] mt-5">
              <Link href="/register">
                <Button variant="secondary" size="sm" className="w-full border-white/10 bg-white/[0.04] sm:w-auto">
                  {prices.cta}
                </Button>
              </Link>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
