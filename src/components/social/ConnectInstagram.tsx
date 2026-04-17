"use client";

import * as React from "react";
import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Connection = {
  platform: string;
  isActive: boolean;
  connectedAt: string;
  instagramUsername?: string | null;
  tokenExpiresAt?: string | null;
};

export function ConnectInstagram() {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState(false);
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
  }, [toast]);

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
    setConnecting(true);
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
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Meta connections…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Meta</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm text-text-secondary">Instagram</span>
          {ig?.isActive ? (
            <div className="flex flex-col gap-0.5">
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                {ig.instagramUsername
                  ? `Connected as @${ig.instagramUsername.replace(/^@/, "")}`
                  : "Connected"}
              </span>
              {expSoon(ig.tokenExpiresAt) ? (
                <span className="text-[11px] text-amber-300/90">
                  Token expiring soon — reconnect in Meta settings
                </span>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={connecting}
              onClick={() => void connect("instagram")}
              className="gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm text-text-secondary">Facebook</span>
          {fb?.isActive ? (
            <div className="flex flex-col gap-0.5">
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                Connected
              </span>
              {expSoon(fb.tokenExpiresAt) ? (
                <span className="text-[11px] text-amber-300/90">
                  Token expiring soon — reconnect in Meta settings
                </span>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={connecting}
              onClick={() => void connect("facebook")}
              className="gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
