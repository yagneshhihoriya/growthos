import { PLATFORM_CONFIG, type GeneratedTitleResult, type TitlePlatform } from "@/types/title-optimizer";

function platformLabel(p: TitlePlatform): string {
  return PLATFORM_CONFIG[p].label;
}

export function parseCompetitorInsightsBlock(raw: string): string[] {
  const idx = raw.search(/COMPETITOR\s+INSIGHTS/i);
  if (idx === -1) return [];
  const block = raw.slice(idx);
  const lines = block.split(/\n/).slice(1);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^\[PLATFORM:/i.test(t)) break;
    const cleaned = t.replace(/^[-•*]\s*/, "").trim();
    if (cleaned) out.push(cleaned);
  }
  return out.slice(0, 12);
}

export function parseTitleGenerationOutput(raw: string, platforms: TitlePlatform[]): GeneratedTitleResult[] {
  const insights = parseCompetitorInsightsBlock(raw);
  const results: GeneratedTitleResult[] = [];

  for (const platform of platforms) {
    const label = platformLabel(platform);
    const marker = `[PLATFORM: ${label}]`;
    const start = raw.indexOf(marker);
    if (start === -1) continue;
    let end = raw.length;
    for (const p of platforms) {
      if (p === platform) continue;
      const m = `[PLATFORM: ${platformLabel(p)}]`;
      const i = raw.indexOf(m, start + marker.length);
      if (i !== -1 && i < end) end = i;
    }
    const section = raw.slice(start, end);

    const titleMatch = section.match(/TITLE:\s*([\s\S]+?)(?=\n\s*CHAR\s+COUNT:|\n\s*BEFORE\s+SCORE:|\n\s*AFTER\s+SCORE:|\n\s*DESCRIPTION:|\n\s*KEYWORDS:|\n\s*\[PLATFORM:|$)/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";

    const charMatch = section.match(/CHAR\s+COUNT:\s*(\d+)/i);
    const beforeMatch = section.match(/BEFORE\s+SCORE:\s*(\d+)\s*\/\s*10/i);
    const afterMatch = section.match(/AFTER\s+SCORE:\s*(\d+)\s*\/\s*10/i);

    const descMatch = section.match(/DESCRIPTION:\s*([\s\S]+?)(?=\n\s*KEYWORDS:|\n\s*\[PLATFORM:|COMPETITOR\s+INSIGHTS|$)/i);
    const kwSection = section.match(/KEYWORDS:\s*([\s\S]+?)(?=\n\s*\[PLATFORM:|COMPETITOR\s+INSIGHTS|$)/i);

    const keywords = kwSection
      ? kwSection[1]
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => l.replace(/^\d+\.\s*/, "").split(/\s[—\-]\s/)[0]?.trim() ?? l)
          .filter(Boolean)
      : [];

    const charLimit = PLATFORM_CONFIG[platform].charLimit;
    const charCount = title.length;

    results.push({
      platform,
      title,
      charCount: Number.isFinite(Number(charMatch?.[1])) ? Number(charMatch?.[1]) : charCount,
      charLimit,
      description: descMatch?.[1]?.trim() || undefined,
      keywords: keywords.length ? keywords : undefined,
      beforeScore: beforeMatch ? Number(beforeMatch[1]) : undefined,
      afterScore: afterMatch ? Number(afterMatch[1]) : undefined,
      competitorInsights: insights.length ? insights : undefined,
    });
  }

  return results;
}
