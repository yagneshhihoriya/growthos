"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Link2,
  Menu,
  Minus,
  Sparkles,
  Star,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LandingFeaturesSection } from "@/components/landing/landing-features";

const MARQUEE = [
  { quote: "Pehli baar itna easy laga listing banana.", author: "Rahul Sharma, Surat" },
  { quote: "WhatsApp bot ne raat ko bhi order liya!", author: "Priya Patel, Ahmedabad" },
  { quote: "Photo quality dekh ke customer khud bold ho gaya.", author: "Amit Jain, Jaipur" },
];

const FAQ = [
  {
    q: "Kya yeh free hai?",
    a: "Haan — Photo Studio aur basic features bilkul free hain. Pro plan sirf ₹99/month.",
  },
  {
    q: "Meesho aur Flipkart ke saath kaam karta hai?",
    a: "Bilkul. Saare 7 tools Meesho, Flipkart, aur Amazon India ke liye banaye gaye hain.",
  },
  {
    q: "Mujhe technical knowledge chahiye?",
    a: "Bilkul nahi. Agar WhatsApp chala sakte ho, GrowthOS chala loge.",
  },
  {
    q: "WhatsApp bot ke liye kya chahiye?",
    a: "Bas apna WhatsApp Business number. Setup mein ~10 minute lagte hain.",
  },
  {
    q: "Mera data safe hai?",
    a: "Haan. Bank-level encryption. Hum aapka data kabhi share nahi karte.",
  },
  {
    q: "Credit card chahiye free trial ke liye?",
    a: "Nahi. Bina credit card ke shuru karo — completely free.",
  },
];


export function LandingPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [faqOpen, setFaqOpen] = React.useState<number | null>(0);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLink = "text-sm font-medium text-text-secondary transition-colors hover:text-text-primary";

  return (
    <div className="min-h-dvh bg-bg-base">
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[700] flex h-16 items-center border-b transition-shadow duration-300",
          scrolled ? "border-border-default bg-bg-base/80 shadow-md backdrop-blur-xl" : "border-transparent bg-bg-base/80 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <a href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand">
            <span className="text-xl leading-none">◆</span>
            GrowthOS
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className={navLink}>
              Features
            </a>
            <a href="#pricing" className={navLink}>
              Pricing
            </a>
            <a href="#footer" className={navLink}>
              Blog
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="hidden md:inline-flex">
                <Button size="sm">Go to Dashboard →</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="hidden md:inline-flex">
                  <Button size="sm">Start Free →</Button>
                </Link>
              </>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[800] flex flex-col bg-bg-base p-6 md:hidden">
          <div className="flex justify-end">
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-10 flex flex-col gap-6 text-lg font-semibold">
            <a href="#features" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <a href="#footer" onClick={() => setMobileOpen(false)}>
              Blog
            </a>
            {isLoggedIn ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  Start Free →
                </Link>
              </>
            )}
          </nav>
        </div>
      ) : null}

      <main>
        {/* Hero */}
        <section className="relative flex min-h-[100dvh] flex-col items-center overflow-hidden px-4 pb-24 pt-24 md:px-6 md:pb-32 md:pt-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand blur-[100px] opacity-15" />
            <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-feature-photo blur-[110px] opacity-15" />
            <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-feature-social blur-[90px] opacity-15" />
          </div>

          <div className="relative z-[1] mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface/80 px-4 py-1.5 text-xs font-medium text-text-secondary shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Used by 500+ sellers across India
            </div>
            <h1
              className="max-w-[18ch] font-extrabold tracking-[-0.02em] text-text-primary"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }}
            >
              India ka sabse smart seller toolkit
            </h1>
            <p className="mt-6 max-w-[560px] text-base leading-relaxed text-text-secondary md:text-lg">
              Save 10+ hours daily. Sell more. Stress less. Built for Meesho · Flipkart · Amazon India sellers.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/register">
                <Button size="lg">Start for Free — No credit card</Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" size="lg">
                  Watch 2-min demo →
                </Button>
              </a>
            </div>
            <p className="mt-10 text-xs font-medium uppercase tracking-wider text-text-tertiary">Trusted by sellers from</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {["Surat", "Bhiwandi", "Jaipur", "Mumbai", "Delhi"].map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>

          {/* Mock + floating cards */}
          <div className="relative z-[1] mx-auto mt-16 w-full max-w-5xl">
            <div className="animate-float absolute -left-2 top-8 z-10 hidden w-48 rounded-xl border border-border-default bg-bg-surface p-3 shadow-card md:block lg:-left-8 lg:top-12 lg:w-52">
              <div className="text-xs text-text-tertiary">📸</div>
              <div className="mt-1 text-sm font-bold text-text-primary">47 photos processed</div>
              <div className="text-xs text-text-secondary">in under 2 minutes</div>
            </div>
            <div className="animate-float-fast absolute -right-4 top-24 z-10 hidden w-48 rotate-2 rounded-xl border border-border-default bg-bg-surface p-3 shadow-card md:block lg:-right-6 lg:top-20 lg:w-52">
              <div className="text-xs text-text-tertiary">📈</div>
              <div className="mt-1 text-sm font-bold text-text-primary">Page 8 → Page 1</div>
              <div className="text-xs text-text-secondary">with AI title optimizer</div>
            </div>
            <div className="animate-float-slow absolute -bottom-4 left-1/4 z-10 hidden w-48 -rotate-1 rounded-xl border border-border-default bg-bg-surface p-3 shadow-card md:block lg:bottom-8">
              <div className="text-xs text-text-tertiary">💬</div>
              <div className="mt-1 text-sm font-bold text-text-primary">23 orders taken</div>
              <div className="text-xs text-text-secondary">via WhatsApp, overnight</div>
            </div>

            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-[var(--card-ring)]">
              <div className="flex h-10 items-center gap-2 border-b border-border-subtle bg-bg-elevated px-4">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                </div>
                <span className="text-[10px] font-medium text-text-tertiary">growthos.in/dashboard</span>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
                <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Processed</div>
                  <div className="mt-1 text-2xl font-bold text-text-primary">47</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                    <div className="h-full w-[72%] rounded-full bg-brand" />
                  </div>
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Queue</div>
                  <div className="mt-1 text-2xl font-bold text-text-primary">12</div>
                  <div className="mt-2 text-xs text-text-secondary">Batch #204</div>
                </div>
                <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4 md:col-span-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Export</div>
                  <div className="mt-1 text-sm font-semibold text-feature-photo">ZIP ready</div>
                  <div className="mt-2 text-xs text-text-tertiary">Meesho + Flipkart sizes</div>
                </div>
              </div>
            </div>
          </div>

          <a
            href="#social-proof"
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-text-tertiary"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-5 w-5 animate-chevron-bob" />
          </a>
        </section>

        {/* Marquee */}
        <section id="social-proof" className="scroll-mt-20 border-y border-border-subtle bg-bg-surface py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Sellers saving time every day with GrowthOS
          </p>
          <div className="relative overflow-hidden">
            <div className="flex w-max gap-12 px-6 animate-marquee hover:[animation-play-state:paused] md:gap-20">
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
                <div key={i} className="flex shrink-0 items-start gap-3">
                  <div className="flex text-amber-500">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <div>
                    <p className="max-w-xs text-sm font-medium text-text-primary">&ldquo;{item.quote}&rdquo;</p>
                    <p className="mt-1 text-xs text-text-tertiary">— {item.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingFeaturesSection />

        {/* How it works — compact 3-col bento */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-border-subtle bg-bg-base pb-10 pt-12 md:pb-12 md:pt-14">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">How it works</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-3 md:gap-4">
              {[
                {
                  n: "1",
                  t: "Sign up free",
                  d: "in 30 seconds",
                  sub: "Email ya Google se — bas itna.",
                  Icon: UserPlus,
                },
                {
                  n: "2",
                  t: "Connect your shop",
                  d: "Meesho, Flipkart, Instagram, WhatsApp",
                  sub: "Jo platform use karte ho, wahan se link.",
                  Icon: Link2,
                },
                {
                  n: "3",
                  t: "Watch it work",
                  d: "AI handles the rest automatically",
                  sub: "Photo batches, titles, alerts — sab auto.",
                  Icon: Zap,
                },
              ].map((step) => {
                const StepIcon = step.Icon;
                return (
                <div
                  key={step.n}
                  className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-center shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-brand/[0.12] to-transparent blur-2xl" aria-hidden />
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-2 opacity-[0.07]">
                    <StepIcon className="h-14 w-14 text-brand" strokeWidth={1.25} aria-hidden />
                  </div>
                  <div className="relative flex flex-col items-center">
                    <div className="relative">
                      <div
                        className="absolute -inset-3 rounded-full bg-gradient-to-br from-brand/25 via-brand/5 to-transparent opacity-80 blur-md"
                        aria-hidden
                      />
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-bold tabular-nums text-brand ring-1 ring-white/[0.06]">
                        {step.n}
                      </div>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold leading-snug tracking-tight text-text-primary">{step.t}</h3>
                    <p className="mt-1 text-xs font-medium leading-snug text-text-secondary">{step.d}</p>
                    <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{step.sub}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="relative scroll-mt-20 overflow-hidden border-t border-border-subtle py-16 md:py-20">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(249,115,22,0.06), transparent 60%)" }} aria-hidden />
          <div className="relative mx-auto max-w-4xl px-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
                <Sparkles className="h-3 w-3" /> Pricing
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-text-primary md:text-3xl">Simple, honest pricing</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
                ₹ prices — no dollar confusion. Start free, upgrade when you&apos;re ready.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2 md:gap-6">
              {/* Free */}
              <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors duration-300 hover:border-white/[0.14]">
                <p className="text-sm font-semibold text-text-primary">Starter</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tabular-nums tracking-tight text-text-primary">₹0</span>
                  <span className="text-sm text-text-tertiary">/mo</span>
                </div>
                <p className="mt-1 text-[13px] text-text-tertiary">Free forever. No card needed.</p>

                <div className="my-6 h-px bg-white/[0.06]" />

                <ul className="space-y-3 text-[13px]">
                  {["AI Photo Studio", "50 images / month", "Basic WhatsApp bot", "1 social account"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-text-secondary">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                        <Check className="h-3 w-3 text-text-tertiary" strokeWidth={2.5} />
                      </div>
                      {f}
                    </li>
                  ))}
                  {["Auto-posting", "Price tracker"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-text-tertiary/50">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.03]">
                        <Minus className="h-3 w-3" strokeWidth={2} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-6 block">
                  <button className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-text-primary transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07]">
                    Get started free
                  </button>
                </Link>
              </div>

              {/* Pro */}
              <div className="group relative rounded-2xl p-px">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-brand/40 via-brand/15 to-brand/5" />
                <div className="relative rounded-[15px] bg-[#0e0e11] p-6">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)]">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-brand">Pro Seller</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tabular-nums tracking-tight text-text-primary">₹99</span>
                    <span className="text-sm text-text-tertiary">/mo</span>
                  </div>
                  <p className="mt-1 text-[13px] text-text-tertiary">14 days free · ₹999/yr saves 2 months</p>

                  <div className="my-6 h-px bg-white/[0.08]" />

                  <ul className="space-y-3 text-[13px]">
                    {["Everything in Starter", "Unlimited images", "Full WhatsApp bot", "All 7 tools unlocked", "30-day autopilot", "Priority support"].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-text-secondary">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                          <Check className="h-3 w-3 text-brand" strokeWidth={2.5} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register" className="mt-6 block">
                    <button className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.5)] transition-all duration-200 hover:shadow-[0_8px_28px_-4px_rgba(249,115,22,0.6)] hover:brightness-110">
                      Start 14-day free trial
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-text-tertiary">
              No hidden charges · No GST surprises · Full refund if not satisfied
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border-subtle bg-bg-base py-16 md:py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">Questions & answers</h2>
              <p className="mt-2 text-sm text-text-secondary">Everything you need to know before getting started.</p>
            </div>
            <div className="mt-10 divide-y divide-white/[0.06]">
              {FAQ.map((item, i) => {
                const open = faqOpen === i;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors"
                      onClick={() => setFaqOpen(open ? null : i)}
                      aria-expanded={open}
                    >
                      <span className={cn("text-sm font-medium transition-colors", open ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary")}>{item.q}</span>
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200", open ? "bg-brand/15 text-brand rotate-180" : "bg-white/[0.05] text-text-tertiary")}>
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                    </button>
                    <div className={cn("grid transition-[grid-template-rows] duration-250 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div className="min-h-0 overflow-hidden">
                        <p className="pb-4 text-[13px] leading-relaxed text-text-tertiary">{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t border-border-subtle py-20 md:py-24">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(249,115,22,0.08), transparent 70%)" }} aria-hidden />
          <div className="relative mx-auto max-w-xl px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
              Ready to grow?{" "}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                Ab aapki baari hai.
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
              Start free today. No credit card. Your first 50 product photos are on us.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button size="lg">Create Free Account →</Button>
              </Link>
              <Link href="/login" className="text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary">
                Sign in →
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="footer" className="border-t border-border-subtle bg-bg-elevated/50 px-6 py-10">
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-base font-extrabold text-brand">
                <span>◆</span> GrowthOS
              </div>
              <p className="mt-2 text-xs text-text-tertiary">India&apos;s seller toolkit</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Product</div>
              <ul className="mt-2.5 space-y-1.5 text-[13px] text-text-secondary">
                <li><a href="#features" className="transition-colors hover:text-text-primary">Features</a></li>
                <li><a href="#pricing" className="transition-colors hover:text-text-primary">Pricing</a></li>
                <li><span className="text-text-tertiary">Changelog</span></li>
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Company</div>
              <ul className="mt-2.5 space-y-1.5 text-[13px] text-text-secondary">
                <li><span className="text-text-tertiary">About</span></li>
                <li><span className="text-text-tertiary">Blog</span></li>
                <li><span className="text-text-tertiary">Contact</span></li>
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Legal</div>
              <ul className="mt-2.5 space-y-1.5 text-[13px] text-text-secondary">
                <li><span className="text-text-tertiary">Privacy Policy</span></li>
                <li><span className="text-text-tertiary">Terms of Service</span></li>
                <li><span className="text-text-tertiary">Refund Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="mx-auto mt-8 h-px max-w-4xl bg-white/[0.05]" />
          <p className="mx-auto mt-6 max-w-4xl text-center text-[11px] text-text-tertiary">
            © 2026 GrowthOS · Made with ♥ for Indian sellers · Surat, Gujarat
          </p>
        </footer>
      </main>
    </div>
  );
}
