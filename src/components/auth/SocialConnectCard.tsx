"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Platform = "instagram" | "facebook";

interface Connection {
  platform: string;
  platformUserId: string;
  instagramAccountId: string | null;
  isActive: boolean;
  connectedAt: string;
}

export function SocialConnectCard({
  platform,
  connection,
  onRefresh,
}: {
  platform: Platform;
  connection: Connection | null;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  const isConnected = connection?.isActive ?? false;
  const label = platform === "instagram" ? "Instagram" : "Facebook";
  const icon = platform === "instagram" ? instagramSvg : facebookSvg;

  async function handleConnect() {
    setLoading(true);
    try {
      const returnTo = window.location.pathname + window.location.search;
      const res = await fetch(
        `/api/social/connect?platform=${platform}&returnTo=${encodeURIComponent(returnTo)}`
      );
      const json = (await res.json()) as { authUrl?: string; error?: string };
      if (!res.ok || !json.authUrl) {
        toast.error("Connection failed", json.error ?? "Could not start OAuth flow");
        return;
      }
      window.location.href = json.authUrl;
    } catch {
      toast.error("Connection failed", "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch(`/api/social/connect`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      toast.success("Disconnected", `${label} account has been disconnected.`);
      onRefresh();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl border p-4 transition-colors",
      isConnected
        ? "border-green-500/20 bg-green-500/[0.03]"
        : "border-white/[0.06] bg-white/[0.02]"
    )}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        dangerouslySetInnerHTML={{ __html: icon }}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary">{label}</p>
        {isConnected ? (
          <p className="text-[11px] text-green-400">
            Connected · ID {connection?.instagramAccountId ?? connection?.platformUserId}
          </p>
        ) : (
          <p className="text-[11px] text-text-tertiary">Not connected</p>
        )}
      </div>

      {isConnected ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleDisconnect()}
          className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleConnect()}
          className="shrink-0 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[11px] font-semibold text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
        >
          {loading ? "Connecting…" : `Connect ${label}`}
        </button>
      )}
    </div>
  );
}

const instagramSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="url(#ig)"/><defs><linearGradient id="ig" x1="40" y1="0" x2="0" y2="40"><stop stop-color="#833AB4"/><stop offset="0.5" stop-color="#FD1D1D"/><stop offset="1" stop-color="#FCAF45"/></linearGradient></defs><rect x="11" y="11" width="18" height="18" rx="5" stroke="white" stroke-width="1.8"/><circle cx="20" cy="20" r="4.5" stroke="white" stroke-width="1.8"/><circle cx="26" cy="14" r="1.2" fill="white"/></svg>`;
const facebookSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#1877F2"/><path d="M24.5 20.5h-2.5v8h-3.5v-8H16v-3h2.5v-2c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5v1.8H25l-.5 3z" fill="white"/></svg>`;
