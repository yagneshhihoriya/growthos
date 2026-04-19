"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock, Mail, MapPin, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField, AuthSelect } from "@/components/auth/AuthField";
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

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [shopName, setShopName] = React.useState("");
  const [city, setCity] = React.useState<string>("Surat");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const strength = passwordStrength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms) {
      toast.warning("Terms required", { description: "Please accept the Terms of Service." });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shopName: shopName || undefined, city, email, password }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : "Registration failed";
        toast.error("Could not create account", { description: msg });
        return;
      }
      toast.success("Account created", { description: "You can sign in now." });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Registration failed", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      <div className="space-y-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Profile</div>
        <AuthField
          label="Full name"
          icon={User}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="As on your bank / GST"
          required
        />
      </div>

      <div className="space-y-5 border-t border-border-subtle pt-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Shop details</div>
        <AuthField
          label="Shop name"
          icon={Store}
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Radha Fashion"
          hint="Optional — add anytime"
        />
        <AuthSelect label="City" icon={MapPin} value={city} onChange={(e) => setCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </AuthSelect>
      </div>

      <div className="space-y-5 border-t border-border-subtle pt-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Login &amp; security</div>
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seller@shop.com"
          required
        />

        <div>
          <AuthField
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
          />
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated ring-1 ring-border-subtle">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-all duration-300",
                  strength >= 100 ? "w-full" : strength >= 75 ? "w-3/4" : strength >= 50 ? "w-1/2" : strength >= 25 ? "w-1/4" : "w-[8%]"
                )}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-text-tertiary">{strengthLabel(strength)}</span>
          </div>
        </div>

        <AuthField
          label="Confirm password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <input type="checkbox" className="peer sr-only" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span
          className={cn(
            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-surface",
            terms ? "border-brand bg-brand text-white" : "border-border-strong bg-transparent peer-hover:border-border-default"
          )}
        >
          {terms ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <span>I agree to the Terms of Service</span>
      </label>

      <Button
        type="submit"
        variant="primaryShine"
        className="min-h-[52px] w-full rounded-xl text-[15px] font-bold tracking-[0.04em]"
        size="lg"
        loading={loading}
      >
        START FOR FREE
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link className="font-semibold text-brand hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
