"use client";

import type { CompetitorAnalysis } from "@/lib/title-pipeline";

export function CompetitorInsights({ data }: { data: CompetitorAnalysis | null }) {
  if (!data) {
    return null;
  }

  const isMock = data.source === "mock_no_api_key";

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Competitor insights</p>
        {isMock ? (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-tertiary">
            Live competitor data in production (set SCRAPER_API_KEY)
          </span>
        ) : null}
      </div>
      {data.insight ? <p className="text-xs text-text-secondary">{data.insight}</p> : null}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">Must-have keywords</p>
        <p className="mt-1 text-sm text-text-primary">{data.sharedKeywords.length ? data.sharedKeywords.join(", ") : "—"}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">Gap keywords</p>
        <p className="mt-1 text-sm text-text-primary">{data.gapKeywords.length ? data.gapKeywords.join(", ") : "—"}</p>
      </div>
      {data.topTitles?.length ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Sample titles</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-text-secondary">
            {data.topTitles.slice(0, 5).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.error ? <p className="text-[11px] text-amber-300/90">Scrape note: {data.error}</p> : null}
    </div>
  );
}
