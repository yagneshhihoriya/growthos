"use client";

import * as React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  month: number;
  year: number;
  productIds: string[];
  language: "hinglish" | "hindi" | "english";
  onComplete: (result: unknown) => void;
  onError: () => void;
};

const STEPS = [
  "Reading your product catalogue",
  "Detecting festival dates for the month",
  "Gemini is writing 30 captions",
  "Building your content calendar",
];

export function AutopilotStep3Generating({ month, year, productIds, language, onComplete, onError }: Props) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);

  const run = React.useCallback(async () => {
    setError(null);
    setActiveStep(0);
    const tickers: Array<ReturnType<typeof setTimeout>> = [];
    STEPS.forEach((_, i) => {
      tickers.push(setTimeout(() => setActiveStep((cur) => Math.max(cur, i)), i * 1500));
    });
    try {
      const res = await fetch("/api/social/autopilot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, productIds, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Generation failed");
      setActiveStep(STEPS.length);
      onComplete(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      tickers.forEach(clearTimeout);
    }
  }, [month, year, productIds, language, onComplete]);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void run();
  }, [run]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Building your calendar</h2>
        <p className="mt-1 text-sm text-text-tertiary">This usually takes 20&ndash;40 seconds.</p>
      </div>

      <ul className="space-y-3">
        {STEPS.map((s, i) => {
          const state = i < activeStep ? "done" : i === activeStep ? "active" : "idle";
          return (
            <li key={s} className="flex items-center gap-3">
              {state === "done" ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-white/20" />
              )}
              <span
                className={
                  state === "idle"
                    ? "text-sm text-text-tertiary"
                    : "text-sm text-text-secondary"
                }
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Generation failed</p>
            <p className="mt-1 text-[12px] text-red-200/80">{error}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void run()}>
                Try again
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onError}>
                Back to products
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
