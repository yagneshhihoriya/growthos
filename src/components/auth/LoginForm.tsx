"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { MetaButton } from "@/components/auth/MetaButton";
import { toast } from "@/lib/toast";

export function LoginForm({
  googleEnabled,
  metaEnabled,
}: {
  googleEnabled: boolean;
  metaEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <GoogleButton disabled={!googleEnabled} />
        <MetaButton disabled={!metaEnabled} />
        {(!googleEnabled || !metaEnabled) && (
          <p className="text-center text-[11px] leading-relaxed text-text-tertiary">
            {!googleEnabled ? "Google sign-in is not configured in this environment. " : null}
            {!metaEnabled ? "Facebook sign-in is not configured." : null}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-default to-transparent" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">or email</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border-default to-transparent" />
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <AuthField
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
          <AuthField
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <p className="mt-2 text-right text-[11px] text-text-tertiary">Forgot password? Coming soon</p>
        </div>

        <Button type="submit" variant="primaryShine" className="h-12 w-full rounded-xl text-[15px] font-bold tracking-wide" size="lg" loading={loading}>
          Sign in to dashboard
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        New here?{" "}
        <Link className="font-semibold text-brand hover:underline" href="/register">
          Start for free →
        </Link>
      </p>
    </div>
  );
}
