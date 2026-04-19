import type { CaptionVariant } from "@/types/caption";

function stripFences(s: string): string {
  return s.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
}

function extractCaptionObjects(buffer: string): CaptionVariant[] {
  const out: CaptionVariant[] = [];
  const text = stripFences(buffer);
  const re = /\{[^{}]*"caption"\s*:\s*"[^"]*"[^{}]*\}/g;
  const matches = Array.from(text.match(re) ?? []);
  for (const raw of matches) {
    try {
      const obj = JSON.parse(raw) as Partial<CaptionVariant>;
      if (typeof obj.caption === "string" && obj.caption.trim()) {
        out.push({
          id: typeof obj.id === "number" ? obj.id : out.length + 1,
          tone: typeof obj.tone === "string" ? obj.tone : "variant",
          caption: obj.caption,
          hashtags: Array.isArray(obj.hashtags) ? obj.hashtags.filter((h) => typeof h === "string") : [],
        });
      }
    } catch {
      // incomplete chunk
    }
  }
  return out;
}

/** Parse accumulated model output into caption variants (streaming-safe). */
export function tryParseCaptionsJson(buffer: string): CaptionVariant[] | null {
  const text = stripFences(buffer);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { captions?: CaptionVariant[] };
      if (Array.isArray(parsed.captions)) {
        const clean = parsed.captions.filter((c) => typeof c.caption === "string");
        if (clean.length) return clean;
      }
    } catch {
      // fall through
    }
  }
  const partial = extractCaptionObjects(text);
  return partial.length ? partial : null;
}
