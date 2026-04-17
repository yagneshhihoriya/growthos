"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AutopilotStep1Month } from "./autopilot/Step1Month";
import { AutopilotStep2Products } from "./autopilot/Step2Products";
import { AutopilotStep3Generating } from "./autopilot/Step3Generating";
import { AutopilotStep4Review } from "./autopilot/Step4Review";
import type { AutopilotPost } from "./autopilot/PostEditSheet";
import type { Festival } from "@/lib/indian-festivals";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type GenerateResult = {
  calendar: { id: string; month: number; year: number; status: string; totalPosts: number };
  posts: AutopilotPost[];
  festivals: Record<string, Festival>;
};

export function AutopilotWizard({ onViewScheduled }: { onViewScheduled?: () => void } = {}) {
  const [step, setStep] = React.useState<WizardStep>(1);
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [productIds, setProductIds] = React.useState<string[]>([]);
  const [language, setLanguage] = React.useState<"hinglish" | "hindi" | "english">("hinglish");
  const [result, setResult] = React.useState<GenerateResult | null>(null);
  const [approvedCount, setApprovedCount] = React.useState(0);

  function reset() {
    setStep(1);
    setResult(null);
    setProductIds([]);
    setApprovedCount(0);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {step < 5 ? (
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                s < step
                  ? "bg-purple-500 text-white"
                  : s === step
                  ? "border-2 border-purple-400 bg-purple-500/20 text-purple-200"
                  : "border border-white/[0.08] bg-white/[0.04] text-text-tertiary"
              )}
            >
              {s}
            </div>
            {s < 4 ? (
              <div
                className={cn(
                  "h-px flex-1 transition-colors",
                  s < step ? "bg-purple-500" : "bg-white/[0.08]"
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
      ) : null}

      {step === 1 ? (
        <AutopilotStep1Month
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
          onNext={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <AutopilotStep2Products
          selectedIds={productIds}
          onChange={setProductIds}
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <AutopilotStep3Generating
          month={month}
          year={year}
          productIds={productIds}
          language={language}
          onComplete={(r) => {
            setResult(r as GenerateResult);
            setStep(4);
          }}
          onError={() => setStep(2)}
        />
      ) : null}

      {step === 4 && result ? (
        <AutopilotStep4Review
          calendarResult={result}
          month={month}
          year={year}
          onBack={() => setStep(2)}
          onApproved={(count) => {
            setApprovedCount(count);
            setStep(5);
          }}
        />
      ) : null}

      {step === 5 ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
            ✅
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            {approvedCount} posts scheduled!
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-tertiary">
            Your autopilot calendar is live. Posts will publish automatically at the best times in
            IST. You can still edit or reschedule any day from the Scheduled tab.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {onViewScheduled ? (
              <button
                type="button"
                onClick={onViewScheduled}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-500/20"
              >
                View in Scheduled tab →
              </button>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/[0.08]"
            >
              Start another month
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
