"use client";

import * as React from "react";
import { Copy, FlaskConical, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { PLATFORM_CHAR_LIMITS, type PlatformKey } from "@/lib/title-pipeline";

export type AbTestPrefill = {
  titleA?: string;
  titleB?: string;
  optimizationId?: string;
  productId?: string | null;
};

type AbTestRow = {
  id: string;
  status: string;
  titleA: string;
  titleB: string;
  platform: string;
  daysA: number;
  daysB: number;
  salesA: number;
  salesB: number;
  currentVariant: string;
  winner: string | null;
  winnerTitle: string | null;
  startedAt: string;
  phaseAEndedAt: string | null;
  endedAt: string | null;
  productId: string | null;
  optimizationId: string | null;
  product: { name: string; rawImageUrls: string[] } | null;
};

type ProductOption = { id: string; name: string };

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            s <= step ? "bg-amber-400" : "bg-white/[0.12]"
          )}
        />
      ))}
    </div>
  );
}

export function AbTestManager({
  prefill,
  onPrefillConsumed,
}: {
  prefill: AbTestPrefill | null;
  onPrefillConsumed?: () => void;
}) {
  const [tests, setTests] = React.useState<AbTestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProductOption[]>([]);

  const [titleA, setTitleA] = React.useState("");
  const [titleB, setTitleB] = React.useState("");
  const [platform, setPlatform] = React.useState<"meesho" | "flipkart" | "amazon">("meesho");
  const [days, setDays] = React.useState(14);
  const [productId, setProductId] = React.useState("");
  const [optimizationId, setOptimizationId] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [salesInput, setSalesInput] = React.useState("");
  const [salesError, setSalesError] = React.useState<string | null>(null);
  const [salesSubmitting, setSalesSubmitting] = React.useState(false);

  const [completePayload, setCompletePayload] = React.useState<{
    winner: string;
    winnerTitle: string;
    message: string;
    improvement: string;
    isBetter: boolean;
    salesPerDayA: string;
    salesPerDayB: string;
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/titles/ab-tests");
      const json = (await res.json()) as { tests?: AbTestRow[] };
      setTests(json.tests ?? []);
    } catch {
      toast.error("Could not load A/B tests");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products");
        const json = (await res.json()) as { products?: ProductOption[] };
        setProducts(json.products ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!prefill) return;
    if (prefill.titleA) setTitleA(prefill.titleA);
    if (prefill.titleB) setTitleB(prefill.titleB);
    if (prefill.optimizationId) setOptimizationId(prefill.optimizationId);
    if (prefill.productId) setProductId(prefill.productId);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  const activeTest = tests.find((t) => t.status === "running_a" || t.status === "running_b") ?? null;
  const titleCharLimit = PLATFORM_CHAR_LIMITS[platform as PlatformKey] ?? 100;
  const salesOk = /^[1-9]\d*$/.test(salesInput.trim());

  function setSalesDigitsOnly(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setSalesInput(digits);
  }

  async function createTest() {
    if (!titleA.trim() || !titleB.trim()) {
      toast.warning("Titles required", { description: "Enter both Title A and Title B." });
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = {
        titleA: titleA.trim(),
        titleB: titleB.trim(),
        platform,
        daysA: days,
        daysB: days,
      };
      if (productId) body.productId = productId;
      if (optimizationId) body.optimizationId = optimizationId;

      const res = await fetch("/api/titles/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; existingTestId?: string; test?: AbTestRow };
      if (res.status === 409) {
        setCreateError(json.error ?? "Active test exists");
        toast.warning("Already running", { description: json.error ?? "" });
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Test started", {
        description: "Use Title A on your listing, then record sales when the period ends.",
      });
      setCompletePayload(null);
      setSalesInput("");
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTest(id: string) {
    try {
      const res = await fetch(`/api/titles/ab-tests/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      toast.success("Deleted", { description: "A/B test removed." });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function submitSales(testId: string) {
    const n = parseInt(salesInput, 10);
    if (!Number.isFinite(n) || n < 1) {
      setSalesError("Enter a whole number of orders (1 or more).");
      return;
    }
    setSalesError(null);
    setSalesSubmitting(true);
    try {
      const res = await fetch(`/api/titles/ab-tests/${testId}/enter-sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: n }),
      });
      const json = (await res.json()) as {
        error?: string;
        phase?: string;
        message?: string;
        titleB?: string;
        winner?: string;
        winnerTitle?: string;
        improvement?: string;
        isBetter?: boolean;
        salesPerDayA?: string;
        salesPerDayB?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed");

      await load();

      if (json.phase === "switched_to_b") {
        toast.success("Phase A saved", { description: json.message ?? "" });
        setSalesInput("");
      } else if (json.phase === "complete") {
        setCompletePayload({
          winner: json.winner ?? "A",
          winnerTitle: json.winnerTitle ?? "",
          message: json.message ?? "",
          improvement: json.improvement ?? "0",
          isBetter: Boolean(json.isBetter),
          salesPerDayA: json.salesPerDayA ?? "0",
          salesPerDayB: json.salesPerDayB ?? "0",
        });
        if (
          json.winner === "B" &&
          json.isBetter &&
          parseFloat(String(json.improvement ?? "0")) > 20
        ) {
          const confetti = (await import("canvas-confetti")).default;
          void confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
        }
        setSalesInput("");
      }
    } catch (e) {
      setSalesError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSalesSubmitting(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading A/B tests…
      </div>
    );
  }

  const completed = tests.filter((t) => t.status === "complete").slice(0, 8);

  if (completePayload) {
    const wonB = completePayload.winner === "B";
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <StepDots step={3} />
          <span className="text-xs text-text-tertiary">Complete</span>
        </div>
        <p className={cn("mt-4 text-lg font-bold", wonB ? "text-emerald-300" : "text-amber-200")}>
          {wonB ? "Title B wins" : completePayload.winner === "A" ? "Title A wins" : "Result"}
        </p>
        <p className="mt-2 rounded-lg bg-black/30 p-3 text-sm text-text-primary ring-1 ring-white/[0.06]">
          {completePayload.winnerTitle}
        </p>
        <p className="mt-3 text-sm text-text-secondary">
          Title A: {completePayload.salesPerDayA}/day · Title B: {completePayload.salesPerDayB}/day
        </p>
        <p className="mt-2 text-sm text-text-tertiary">{completePayload.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void copyText(completePayload.winnerTitle)}>
            <Copy className="h-4 w-4" />
            Copy winning title
          </Button>
          <Button type="button" variant="ghost" onClick={() => setCompletePayload(null)}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (activeTest) {
    const t = activeTest;
    const platformLabel = t.platform.charAt(0).toUpperCase() + t.platform.slice(1);

    if (t.status === "running_a") {
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">A/B test in progress</p>
                <p className="mt-1 text-sm text-text-secondary">Manual sales tracking — you enter orders from your marketplace dashboard.</p>
              </div>
              <Button type="button" size="sm" variant="ghost" className="text-red-400" onClick={() => void deleteTest(t.id)}>
                <Trash2 className="h-4 w-4" />
                Cancel
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <StepDots step={1} />
              <span className="text-xs text-text-tertiary">Step 1 of 3</span>
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">Title A is live on {platformLabel}</p>
            <p className="mt-2 rounded-lg bg-black/30 p-3 text-sm text-text-primary ring-1 ring-white/[0.06]">{t.titleA}</p>
            <p className="mt-3 text-xs text-text-tertiary">
              Run Title A for {t.daysA} days, then enter how many orders you got (from your seller panel).
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Started {formatDistanceToNow(new Date(t.startedAt), { addSuffix: true })}
            </p>
            <div className="mt-4">
              <label className="text-xs text-text-tertiary">Orders with Title A (whole number)</label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={salesInput}
                onChange={(e) => setSalesDigitsOnly(e.target.value)}
                className="mt-1 max-w-xs"
                placeholder="e.g. 23"
              />
              {salesError ? <p className="mt-1 text-xs text-red-400">{salesError}</p> : null}
            </div>
            <Button
              type="button"
              className="mt-4 gap-2"
              disabled={salesSubmitting || !salesOk}
              onClick={() => void submitSales(t.id)}
            >
              {salesSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record & switch to Title B
            </Button>
          </div>
        </div>
      );
    }

    if (t.status === "running_b") {
      const perDayA = t.daysA > 0 ? (t.salesA / t.daysA).toFixed(1) : "0";
      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">A/B test in progress</p>
              <Button type="button" size="sm" variant="ghost" className="text-red-400" onClick={() => void deleteTest(t.id)}>
                <Trash2 className="h-4 w-4" />
                Cancel
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <StepDots step={2} />
              <span className="text-xs text-text-tertiary">Step 2 of 3</span>
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              Phase A: <span className="font-semibold text-text-primary">{t.salesA}</span> orders / {t.daysA} days (
              <span className="text-amber-200">{perDayA}</span>/day)
            </p>
            <p className="mt-4 text-sm font-medium text-text-primary">Switch your {platformLabel} listing to Title B</p>
            <p className="mt-2 rounded-lg bg-black/30 p-3 text-sm text-text-primary ring-1 ring-white/[0.06]">{t.titleB}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-2 gap-1" onClick={() => void copyText(t.titleB)}>
              <Copy className="h-3.5 w-3.5" />
              Copy Title B
            </Button>
            {t.phaseAEndedAt ? (
              <p className="mt-2 text-xs text-text-tertiary">
                Phase A ended {formatDistanceToNow(new Date(t.phaseAEndedAt), { addSuffix: true })}
              </p>
            ) : null}
            <div className="mt-4">
              <label className="text-xs text-text-tertiary">Orders with Title B (whole number)</label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={salesInput}
                onChange={(e) => setSalesDigitsOnly(e.target.value)}
                className="mt-1 max-w-xs"
              />
              {salesError ? <p className="mt-1 text-xs text-red-400">{salesError}</p> : null}
            </div>
            <Button
              type="button"
              className="mt-4 gap-2"
              disabled={salesSubmitting || !salesOk}
              onClick={() => void submitSales(t.id)}
            >
              {salesSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Determine winner
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-8">
      {tests.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
          <p className="text-sm font-medium text-text-primary">Start your first A/B test</p>
          <p className="mt-1 text-xs text-text-tertiary">
            You have no saved tests yet. Use the form below when you have your live listing title (Title A) and a variant (Title B). Tracking is manual — you enter order counts from your seller dashboard.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Start an A/B title test</p>
            <p className="mt-1 text-xs text-text-tertiary">
              You run Title A on your listing, record orders, then switch to Title B and record again. No automatic click
              tracking — marketplaces do not expose that without API access.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Catalog product (optional)</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Platform</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as typeof platform)}
            >
              <option value="meesho">Meesho</option>
              <option value="flipkart">Flipkart</option>
              <option value="amazon">Amazon</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Days per phase</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
            >
              {[7, 10, 14, 21, 30].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Title A (currently live)</label>
            <textarea
              value={titleA}
              onChange={(e) => setTitleA(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm"
            />
            <p
              className={cn(
                "mt-1 text-[11px] tabular-nums",
                titleA.length > titleCharLimit ? "text-red-400" : "text-text-tertiary"
              )}
            >
              {titleA.length} / {titleCharLimit} characters ({platform}) — match your live listing length for this marketplace
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Title B (variant to test)</label>
            <textarea
              value={titleB}
              onChange={(e) => setTitleB(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm"
            />
            <p
              className={cn(
                "mt-1 text-[11px] tabular-nums",
                titleB.length > titleCharLimit ? "text-red-400" : "text-text-tertiary"
              )}
            >
              {titleB.length} / {titleCharLimit} characters ({platform})
            </p>
          </div>
        </div>
        {createError ? <p className="mt-3 text-sm text-red-400">{createError}</p> : null}
        <Button type="button" className="mt-4 gap-2" disabled={creating} onClick={() => void createTest()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Start A/B test
        </Button>
      </div>

      {completed.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Recent completed</p>
          <ul className="space-y-2">
            {completed.map((c) => (
              <li key={c.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm">
                <span className="font-medium text-emerald-300/90">Winner {c.winner}</span>
                <span className="mx-2 text-text-tertiary">·</span>
                <span className="text-text-secondary">{c.product?.name ?? "Product"}</span>
                <span className="ml-2 text-xs text-text-tertiary">
                  {c.endedAt ? formatDistanceToNow(new Date(c.endedAt), { addSuffix: true }) : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
