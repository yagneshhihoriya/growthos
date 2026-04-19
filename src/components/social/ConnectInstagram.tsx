"use client";

import * as React from "react";
import { CheckCircle2, Facebook, Instagram, Loader2, Plug, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type Connection = {
  platform: string;
  isActive: boolean;
  connectedAt: string;
  instagramUsername?: string | null;
  tokenExpiresAt?: string | null;
};

export function ConnectInstagram() {
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState<"instagram" | "facebook" | null>(null);
  const [connections, setConnections] = React.useState<Connection[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/connections");
      const json = (await res.json()) as { connections?: Connection[] };
      setConnections(json.connections ?? []);
    } catch {
      toast.error("Could not load connections");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const ig = connections.find((c) => c.platform === "instagram");
  const fb = connections.find((c) => c.platform === "facebook");

  const expSoon = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    return t < Date.now() + 10 * 24 * 60 * 60 * 1000;
  };

  async function connect(platform: "instagram" | "facebook") {
    setConnecting(platform);
    try {
      const res = await fetch(`/api/social/connect?platform=${platform}`);
      const json = (await res.json()) as { authUrl?: string; error?: string };
      if (!res.ok || !json.authUrl) {
        throw new Error(json.error ?? "Could not start OAuth");
      }
      window.location.href = json.authUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connect failed";
      toast.error(msg);
      setConnecting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Meta connections…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Meta connections</p>
        <span className="text-[11px] text-text-tertiary">
          {[ig?.isActive, fb?.isActive].filter(Boolean).length} / 2 connected
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlatformCard
          platform="instagram"
          name="Instagram"
          connected={Boolean(ig?.isActive)}
          subtitle={
            ig?.isActive
              ? ig.instagramUsername
                ? `@${ig.instagramUsername.replace(/^@/, "")}`
                : "Connected"
              : "Post reels & feed photos straight from GrowthOS."
          }
          expiringSoon={expSoon(ig?.tokenExpiresAt)}
          connecting={connecting === "instagram"}
          onConnect={() => void connect("instagram")}
        />
        <PlatformCard
          platform="facebook"
          name="Facebook"
          connected={Boolean(fb?.isActive)}
          subtitle={
            fb?.isActive
              ? "Page connected"
              : "Cross-post to your Facebook Page in one click."
          }
          expiringSoon={expSoon(fb?.tokenExpiresAt)}
          connecting={connecting === "facebook"}
          onConnect={() => void connect("facebook")}
        />
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  name,
  connected,
  subtitle,
  expiringSoon,
  connecting,
  onConnect,
}: {
  platform: "instagram" | "facebook";
  name: string;
  connected: boolean;
  subtitle: string;
  expiringSoon: boolean;
  connecting: boolean;
  onConnect: () => void;
}) {
  const isIg = platform === "instagram";
  const Icon = isIg ? Instagram : Facebook;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all",
        connected
          ? "border-white/[0.1] bg-white/[0.03]"
          : "border-white/[0.08] bg-black/20 hover:border-white/[0.14]"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity",
          isIg
            ? "bg-gradient-to-br from-fuchsia-500/30 to-amber-400/20"
            : "bg-[#1877F2]/25",
          connected ? "opacity-40" : "opacity-20 group-hover:opacity-35"
        )}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            isIg
              ? "bg-gradient-to-br from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5]"
              : "bg-[#1877F2]"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{name}</p>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            ) : (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-text-tertiary">{subtitle}</p>
          {connected && expiringSoon ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-amber-300/90">
              <ShieldAlert className="h-3 w-3" />
              Token expiring soon — reconnect in Meta settings
            </p>
          ) : null}
        </div>
        {!connected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60",
              isIg
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:brightness-110"
                : "bg-[#1877F2] hover:bg-[#1668d9]"
            )}
          >
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Connect
          </button>
        ) : null}
      </div>
    </div>
  );
}
