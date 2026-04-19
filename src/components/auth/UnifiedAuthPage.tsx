"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  Store,
  User,
  Zap,
} from "lucide-react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { MetaButton } from "@/components/auth/MetaButton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const cities = ["Surat", "Mumbai", "Ahmedabad", "Jaipur", "Delhi", "Other"] as const;

function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  return score;
}

function strengthLabel(s: number): string {
  if (s >= 100) return "Strong";
  if (s >= 75) return "Good";
  if (s >= 50) return "Fair";
  if (s >= 25) return "Weak";
  return "Too short";
}

type IconType = React.ComponentType<{ className?: string }>;

function DarkField({
  label,
  icon: Icon,
  id,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: IconType }) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </label>
      <div className="group mt-2 flex items-center gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 transition-all duration-200 focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <Icon className="h-[18px] w-[18px] shrink-0 text-neutral-500 transition-colors group-focus-within:text-neutral-300" />
        <input
          id={inputId}
          className="w-full min-w-0 bg-transparent text-[15px] text-neutral-100 outline-none placeholder:text-neutral-600"
          {...props}
        />
      </div>
    </div>
  );
}

/* ─── Register: immersive dark split-screen ─── */

const STATS = [
  { n: "10K+", label: "Active sellers" },
  { n: "1M+", label: "Images processed" },
  { n: "4.9", label: "Average rating", icon: Star },
];

const FEATURES = [
  { icon: Camera, text: "AI-powered product photos" },
  { icon: MessageCircle, text: "WhatsApp order automation" },
  { icon: Zap, text: "One-click marketplace export" },
  { icon: Shield, text: "Bank-grade encryption" },
];

function RegisterPanel() {
  return (
    <div className="relative hidden w-full shrink-0 overflow-hidden bg-[#08080a] md:flex md:w-[48%] lg:w-[46%]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-[30%] top-[10%] h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[120px]" />
        <div className="absolute -right-[20%] bottom-[5%] h-[400px] w-[400px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute left-[40%] top-[50%] h-[300px] w-[300px] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-[1] flex h-full w-full flex-col justify-between px-8 py-10 lg:px-14 lg:py-14">
        {/* Logo — links to landing */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/25 ring-1 ring-white/15">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">GrowthOS</span>
        </Link>

        {/* Hero text */}
        <div className="my-auto space-y-8 py-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-orange-300/90 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" />
              Free forever — no credit card
            </div>
            <h1 className="mt-6 text-[32px] font-extrabold leading-[1.15] tracking-tight text-white lg:text-[38px]">
              Grow your
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-amber-300 bg-clip-text text-transparent">
                online business
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">
              Photo studio, WhatsApp bot, marketplace tools — everything Indian sellers need to sell more in less time.
            </p>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => {
              const FIcon = f.icon;
              return (
                <div
                  key={f.text}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm"
                >
                  <FIcon className="h-4 w-4 shrink-0 text-orange-400/80" />
                  <span className="text-[12px] font-medium leading-snug text-white/70">{f.text}</span>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 border-t border-white/[0.08] pt-6">
            {STATS.map((s) => {
              const SIcon = s.icon;
              return (
                <div key={s.label}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-extrabold tabular-nums text-white">{s.n}</span>
                    {SIcon ? <SIcon className="h-3.5 w-3.5 fill-orange-400 text-orange-400" /> : null}
                  </div>
                  <span className="text-[11px] text-white/45">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Social proof footer */}
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
          <div className="flex -space-x-2">
            {["R", "P", "A"].map((l, i) => (
              <div
                key={l}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#08080a] bg-gradient-to-br from-white/20 to-white/5 text-[11px] font-bold text-white/80"
                style={{ zIndex: 3 - i }}
              >
                {l}
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-0.5 text-[11px] text-white/50">Loved by 10,000+ sellers across India</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegField({
  label,
  icon: Icon,
  id,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: IconType }) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={inputId} className="mb-1.5 block text-[12px] font-medium text-neutral-300">
        {label}
      </label>
      <div className="group flex items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 transition-all duration-200 focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <Icon className="h-4 w-4 shrink-0 text-neutral-500 transition-colors group-focus-within:text-neutral-300" />
        <input
          id={inputId}
          className="w-full min-w-0 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
          {...props}
        />
      </div>
    </div>
  );
}

function RegSelect({
  label,
  icon: Icon,
  id,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & { label: string; icon: IconType }) {
  const autoId = React.useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={selectId} className="mb-1.5 block text-[12px] font-medium text-neutral-300">
        {label}
      </label>
      <div className="group relative flex items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 transition-all duration-200 focus-within:border-white/20 focus-within:bg-white/[0.06]">
        <Icon className="h-4 w-4 shrink-0 text-neutral-500 transition-colors group-focus-within:text-neutral-300" />
        <select
          id={selectId}
          className="w-full cursor-pointer appearance-none bg-transparent py-0 pr-8 text-sm text-neutral-100 outline-none"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden />
      </div>
    </div>
  );
}

export function UnifiedAuthPage({
  mode,
  googleEnabled,
  metaEnabled,
}: {
  mode: "login" | "register";
  googleEnabled: boolean;
  metaEnabled: boolean;
}) {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);

  const [name, setName] = React.useState("");
  const [shopName, setShopName] = React.useState("");
  const [city, setCity] = React.useState<string>("Surat");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [registerLoading, setRegisterLoading] = React.useState(false);

  const strength = passwordStrength(regPassword);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Sign in failed", { description: "Check your email and password." });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Sign in failed", { description: "Please try again." });
    } finally {
      setLoginLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) {
      toast.warning("Terms required", { description: "Please accept the Terms of Service." });
      return;
    }
    if (regPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shopName: shopName || undefined,
          city,
          email: regEmail,
          password: regPassword,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data
            ? String((data as { error: string }).error)
            : "Registration failed";
        toast.error("Could not create account", { description: msg });
        return;
      }
      toast.success("Account created", { description: "You can sign in now." });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Registration failed", { description: "Please try again." });
    } finally {
      setRegisterLoading(false);
    }
  }

  /* ── Register: dark immersive split-screen ── */
  if (mode === "register") {
    return (
      <div className="flex min-h-dvh bg-[#0b0b0e] md:flex-row">
        <RegisterPanel />

        {/* Right: form column */}
        <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
          {/* Scrollable form region */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 sm:px-8 md:px-12 lg:px-16">
            <div className="w-full max-w-[480px]">
              {/* Mobile-only logo */}
              <Link href="/" className="mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-80 md:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/25 ring-1 ring-white/15">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight text-white">GrowthOS</span>
              </Link>

              {/* Header */}
              <div>
                <h1 className="text-[22px] font-bold tracking-tight text-white sm:text-2xl">Create your free account</h1>
                <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-orange-400 transition-colors hover:text-orange-300">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Social auth */}
              <div className="mt-7 flex gap-3">
                <GoogleButton disabled={!googleEnabled} appearance="dark" />
                <MetaButton disabled={!metaEnabled} appearance="dark" />
              </div>
              {(!googleEnabled || !metaEnabled) && (
                <p className="mt-2 text-[11px] text-neutral-600">
                  {!googleEnabled ? "Google not configured. " : null}
                  {!metaEnabled ? "Facebook not configured." : null}
                </p>
              )}

              {/* Divider */}
              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-600">or continue with email</span>
                <div className="h-px flex-1 bg-white/[0.07]" />
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={onRegister}>
                {/* Two-column name row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <RegField
                    label="Full name"
                    icon={User}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                  <RegField
                    label="Shop name"
                    icon={Store}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <RegField
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@shop.com"
                    required
                  />
                  <RegSelect label="City" icon={MapPin} value={city} onChange={(e) => setCity(e.target.value)}>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </RegSelect>
                </div>

                <RegField
                  label="Password"
                  icon={Lock}
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
                {regPassword && (
                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          strength >= 75 ? "bg-emerald-500" : strength >= 50 ? "bg-amber-500" : "bg-orange-500",
                          strength >= 100 ? "w-full" : strength >= 75 ? "w-3/4" : strength >= 50 ? "w-1/2" : strength >= 25 ? "w-1/4" : "w-[8%]"
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium tabular-nums",
                      strength >= 75 ? "text-emerald-400" : strength >= 50 ? "text-amber-400" : "text-neutral-500"
                    )}>
                      {strengthLabel(strength)}
                    </span>
                  </div>
                )}
                <RegField
                  label="Confirm password"
                  icon={Lock}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />

                {/* Terms */}
                <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm text-neutral-500 transition-colors hover:text-neutral-300">
                  <input type="checkbox" className="peer sr-only" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                  <span
                    className={cn(
                      "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0b0b0e]",
                      terms ? "border-orange-500 bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "border-white/15 bg-transparent hover:border-white/25"
                    )}
                  >
                    {terms ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span>
                    I agree to the{" "}
                    <span className="text-neutral-300 underline decoration-neutral-700 underline-offset-2">Terms of Service</span>
                  </span>
                </label>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-[15px] font-bold text-white shadow-[0_8px_30px_-6px_rgba(249,115,22,0.45)] transition-all duration-200 hover:shadow-[0_12px_40px_-4px_rgba(249,115,22,0.55)] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {registerLoading ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-600">
                By creating an account you agree to our Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Login: split-screen matching register ── */
  return (
    <div className="flex min-h-dvh bg-[#0b0b0e] md:flex-row">
      <RegisterPanel />

      <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 sm:px-8 md:px-12 lg:px-16">
          <div className="w-full max-w-[420px]">
            {/* Mobile-only logo */}
            <Link href="/" className="mb-8 flex items-center gap-2.5 transition-opacity hover:opacity-80 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/25 ring-1 ring-white/15">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">GrowthOS</span>
            </Link>

            {/* Header */}
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-white sm:text-2xl">Welcome back</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-orange-400 transition-colors hover:text-orange-300">
                  Create one free
                </Link>
              </p>
            </div>

            {/* Social auth */}
            <div className="mt-7 flex gap-3">
              <GoogleButton disabled={!googleEnabled} appearance="dark" />
              <MetaButton disabled={!metaEnabled} appearance="dark" />
            </div>
            {(!googleEnabled || !metaEnabled) && (
              <p className="mt-2 text-[11px] text-neutral-600">
                {!googleEnabled ? "Google not configured. " : null}
                {!metaEnabled ? "Facebook not configured." : null}
              </p>
            )}

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-600">or continue with email</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={onLogin}>
              <DarkField
                label="Email"
                icon={Mail}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <div>
                <DarkField
                  label="Password"
                  icon={Lock}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <div className="mt-2 text-right">
                  <span className="cursor-default text-[11px] text-neutral-600">Forgot password? Coming soon</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-[15px] font-bold text-white shadow-[0_8px_30px_-6px_rgba(249,115,22,0.45)] transition-all duration-200 hover:shadow-[0_12px_40px_-4px_rgba(249,115,22,0.55)] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {loginLoading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Sign in to dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-600">
              By continuing, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
