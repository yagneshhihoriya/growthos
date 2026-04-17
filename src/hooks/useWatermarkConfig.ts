"use client";

import { useCallback, useEffect, useState } from "react";

interface WatermarkConfig {
  logoUrl: string | null;
  textContent: string;
  fontFamily: string;
  textColor: string;
  position: string;
  opacity: number;
  scale: number;
  padding: number;
}

interface UseWatermarkConfigReturn {
  config: WatermarkConfig;
  isLoading: boolean;
  isSaving: boolean;
  update: (partial: Partial<WatermarkConfig>) => void;
  save: () => Promise<boolean>;
}

const defaults: WatermarkConfig = {
  logoUrl: null,
  textContent: "",
  fontFamily: "Inter",
  textColor: "#ffffff",
  position: "bottom-right",
  opacity: 0.25,
  scale: 0.15,
  padding: 20,
};

export function useWatermarkConfig(): UseWatermarkConfigReturn {
  const [config, setConfig] = useState<WatermarkConfig>(defaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/watermark");
        if (!res.ok) return;
        const json = (await res.json()) as { preset: Record<string, unknown> | null };
        if (cancelled || !json.preset) return;
        const p = json.preset;
        setConfig({
          logoUrl: (p.logoUrl as string) ?? null,
          textContent: (p.textContent as string) ?? (p.textWatermark as string) ?? "",
          fontFamily: (p.fontFamily as string) ?? "Inter",
          textColor: (p.textColor as string) ?? "#ffffff",
          position: (p.position as string) ?? "bottom-right",
          opacity: (p.opacity as number) ?? 0.25,
          scale: (p.scale as number) ?? 0.15,
          padding: (p.padding as number) ?? 20,
        });
      } catch {
        // use defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const update = useCallback((partial: Partial<WatermarkConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  return { config, isLoading, isSaving, update, save };
}
