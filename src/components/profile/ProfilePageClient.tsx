"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Lock, Mail, MapPin, Pencil, Store, User, Bell } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const cities = ["Surat", "Mumbai", "Ahmedabad", "Jaipur", "Delhi", "Other"] as const;

const pageBg =
  "min-h-[calc(100dvh-56px-3rem)] bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(255,255,255,0.022),transparent_55%),#030303]";

const cardClass =
  "rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#111111] p-8 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]";

const inputClass =
  "w-full rounded-[8px] border border-white/[0.08] bg-[#0a0a0a] px-3.5 py-2.5 text-[15px] text-white outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-text-tertiary/70 hover:border-white/20 focus:border-brand/40 focus:shadow-[0_0_10px_rgba(249,115,22,0.2)] focus:ring-0";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wider text-[#888888]";

const fieldIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/60";

export type ProfileInitial = {
  name: string;
  email: string;
  shopName: string | null;
  city: string;
  hasPassword: boolean;
  avatarUrl: string | null;
};

type Section = "general" | "security" | "notifications";

function cityOptions(current: string): readonly string[] {
  const set = new Set<string>(cities);
  if (current && !set.has(current)) return [current, ...cities];
  return cities;
}

type IconType = React.ComponentType<{ className?: string }>;

function Field({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon: IconType;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={labelClass}>{label}</label>
      <div className="relative flex items-center gap-2.5">
        <Icon className={fieldIconClass} aria-hidden />
        <div className="w-full pl-10">{children}</div>
      </div>
    </div>
  );
}

const NAV: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

export function ProfilePageClient({ initial }: { initial: ProfileInitial }) {
  const toast = useToast();
  const { update } = useSession();
  const citiesForSelect = React.useMemo(() => cityOptions(initial.city), [initial.city]);

  const [section, setSection] = React.useState<Section>("general");
  const [name, setName] = React.useState(initial.name);
  const [shopName, setShopName] = React.useState(initial.shopName ?? "");
  const [city, setCity] = React.useState(initial.city);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initial.avatarUrl);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [passwordExpanded, setPasswordExpanded] = React.useState(false);

  function resetPasswordFields() {
    setPasswordExpanded(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function persistProfile(overrides?: { avatarUrl?: string | null }) {
    const body: Record<string, unknown> = {
      name: name.trim(),
      shopName: shopName.trim() || null,
      city: city.trim(),
    };
    if (overrides?.avatarUrl !== undefined) {
      body.avatarUrl = overrides.avatarUrl;
    }
    if (passwordExpanded && newPassword.trim()) {
      body.newPassword = newPassword.trim();
      if (initial.hasPassword) body.currentPassword = currentPassword;
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    if (!res.ok) {
      const msg =
        typeof data === "object" && data && "error" in data ? String((data as { error: string }).error) : "Update failed";
      throw new Error(msg);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordExpanded) {
      if (newPassword || confirmPassword || currentPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        if (newPassword && newPassword.length < 8) {
          toast.error("New password must be at least 8 characters");
          return;
        }
        if (newPassword && initial.hasPassword && !currentPassword) {
          toast.error("Enter your current password to set a new one");
          return;
        }
      }
    }

    setSaving(true);
    try {
      await persistProfile();
      toast.success("Profile saved", "Your details are up to date.");
      resetPasswordFields();
      await update();
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file", "Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", "Max size is 10 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const presigned = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          sizeBytes: file.size,
        }),
      });
      const presignedJson: unknown = await presigned.json();
      if (!presigned.ok) {
        const msg =
          typeof presignedJson === "object" && presignedJson && "error" in presignedJson
            ? String((presignedJson as { error: string }).error)
            : "Upload failed";
        throw new Error(msg);
      }
      const { uploadUrl, publicUrl } = presignedJson as { uploadUrl: string; publicUrl: string };
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Upload failed");

      setAvatarUrl(publicUrl);
      await persistProfile({ avatarUrl: publicUrl });
      toast.success("Photo updated", "Your profile picture is saved.");
      await update();
    } catch (err) {
      toast.error("Upload failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className={cn(pageBg, "-mx-6 px-4 pb-28 sm:px-6 lg:-mx-6 lg:px-8")}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:gap-12 lg:pt-2">
        {/* Sub-navigation */}
        <aside className="shrink-0 lg:w-52">
          <nav className="flex flex-row gap-1 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  section === item.id
                    ? "border border-brand/25 bg-[#111111] shadow-brand"
                    : "border border-transparent text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content — 32px (mb-8) below Settings header before first card */}
        <div className="min-w-0 flex-1 pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">Settings</h1>
            <p className="mt-1 text-sm text-text-secondary">Manage your account and preferences.</p>
          </div>

          <form id="profile-settings-form" onSubmit={onSubmit} className="space-y-8">
            {section === "general" ? (
              <div className="space-y-8">
                <section className={cardClass}>
                  <h2 className="text-sm font-medium text-text-primary">Profile</h2>
                  <p className="mt-1 text-xs text-text-tertiary">Public info and how we address you.</p>

                  <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/[0.14] bg-zinc-950 ring-2 ring-white/[0.1] ring-offset-2 ring-offset-[#111111]",
                          avatarUploading && "opacity-70"
                        )}
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-semibold text-white">{(name || "S").slice(0, 1).toUpperCase()}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={avatarUploading}
                          className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 text-xs font-semibold text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={onAvatarChange}
                      />
                      <p className="mt-3 max-w-[9rem] text-[11px] leading-snug text-text-tertiary">JPG, PNG or WebP · max 10 MB</p>
                    </div>

                    <div className="min-w-0 flex-1 space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                        <Field label="Full name" icon={User}>
                          <input
                            className={inputClass}
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                          />
                        </Field>
                        <Field label="Shop name" icon={Store}>
                          <input
                            className={inputClass}
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            placeholder="e.g. Radha Fashion"
                          />
                        </Field>
                      </div>
                      <div className="max-w-md">
                        <label className={labelClass} htmlFor="profile-city">
                          City
                        </label>
                        <div className="relative">
                          <MapPin className={fieldIconClass} />
                          <select
                            id="profile-city"
                            className={cn(inputClass, "cursor-pointer appearance-none pl-10 pr-10")}
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                          >
                            {citiesForSelect.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={cardClass}>
                  <h2 className="text-sm font-medium text-text-primary">Login</h2>
                  <p className="mt-1 text-xs text-text-tertiary">Your sign-in email cannot be changed.</p>
                  <div className="mt-8 max-w-lg">
                    <Field label="Email" icon={Mail}>
                      <input
                        className={cn(inputClass, "cursor-not-allowed opacity-95 hover:border-white/[0.08]")}
                        type="email"
                        autoComplete="email"
                        value={initial.email}
                        readOnly
                        disabled
                      />
                    </Field>
                  </div>
                </section>
              </div>
            ) : null}

            {section === "security" ? (
              <section className={cardClass}>
                <h2 className="text-sm font-medium text-text-primary">Password</h2>
                <p className="mt-1 text-xs text-text-tertiary">
                  {initial.hasPassword
                    ? "Use a strong password you don’t use elsewhere."
                    : "Add a password to sign in with email, or keep using Google / Facebook only."}
                </p>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => (passwordExpanded ? resetPasswordFields() : setPasswordExpanded(true))}
                    className={cn(
                      "flex w-full max-w-md items-center justify-between rounded-[8px] border border-white/[0.1] bg-[#0a0a0a] px-4 py-3 text-left text-sm font-medium text-text-primary transition-all hover:border-white/20 hover:bg-[#0d0d0d]"
                    )}
                    aria-expanded={passwordExpanded}
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-brand/60" />
                      {passwordExpanded ? "Hide password fields" : "Update password"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-brand/60 transition-transform duration-300",
                        passwordExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      passwordExpanded ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                    )}
                    aria-hidden={!passwordExpanded}
                  >
                    <div className="space-y-6 pt-6">
                      {initial.hasPassword ? (
                        <Field label="Current password" icon={Lock}>
                          <input
                            className={inputClass}
                            type="password"
                            autoComplete="current-password"
                            tabIndex={passwordExpanded ? 0 : -1}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </Field>
                      ) : null}
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Field label={initial.hasPassword ? "New password" : "Create password"} icon={Lock}>
                          <input
                            className={inputClass}
                            type="password"
                            autoComplete="new-password"
                            tabIndex={passwordExpanded ? 0 : -1}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                          />
                        </Field>
                        <Field label="Confirm password" icon={Lock}>
                          <input
                            className={inputClass}
                            type="password"
                            autoComplete="new-password"
                            tabIndex={passwordExpanded ? 0 : -1}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {section === "notifications" ? (
              <section className={cardClass}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Bell className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-text-primary">Notifications</h2>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Product updates, tips, and billing alerts. We&apos;re finishing preference controls — you&apos;ll choose channels here soon.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-text-secondary">
                        Email digest — coming soon
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-text-secondary">
                        WhatsApp alerts — coming soon
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

          </form>
        </div>
      </div>

      {/* Fixed save — high contrast */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[300] flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:p-6 lg:pl-[calc(240px+1.5rem)]">
        <div className="pointer-events-auto">
          <button
            type="submit"
            form="profile-settings-form"
            disabled={saving}
            className={cn(
              "inline-flex min-w-[160px] items-center justify-center rounded-[8px] border border-white/10 bg-gradient-to-b from-[#ff9538] via-[#f97316] to-[#c2410c] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.25)] transition-[transform,box-shadow,filter] duration-200 hover:scale-[1.02] hover:from-[#ffb86c] hover:via-[#fb923c] hover:to-[#ea580c] hover:shadow-[0_0_32px_rgba(249,115,22,0.45),0_0_60px_rgba(249,115,22,0.2)] active:scale-100 disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100 disabled:shadow-none disabled:hover:shadow-none"
            )}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
