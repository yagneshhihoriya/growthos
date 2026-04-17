"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type CaptionVariant = {
  id: number;
  tone: string;
  caption: string;
  hashtags: string[];
};

function tryParseCaptionsJson(buffer: string): CaptionVariant[] | null {
  const start = buffer.indexOf("{");
  const end = buffer.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(buffer.slice(start, end + 1)) as { captions?: CaptionVariant[] };
    if (!parsed.captions || !Array.isArray(parsed.captions)) return null;
    return parsed.captions.filter((c) => typeof c.caption === "string");
  } catch {
    return null;
  }
}

export function CaptionGenerator({
  onSelect,
}: {
  onSelect: (caption: string, hashtags: string[]) => void;
}) {
  const toast = useToast();
  const [productName, setProductName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [colors, setColors] = React.useState("");
  const [sizes, setSizes] = React.useState("");
  const [fabric, setFabric] = React.useState("");
  const [language, setLanguage] = React.useState<"hindi" | "hinglish" | "english">("hinglish");
  const [tone, setTone] = React.useState<"casual" | "urgent" | "festive" | "premium">("casual");
  const [streaming, setStreaming] = React.useState(false);
  const [buffer, setBuffer] = React.useState("");
  const [variants, setVariants] = React.useState<CaptionVariant[]>([]);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  async function generate() {
    const p = parseFloat(price);
    if (!productName.trim() || !category.trim() || !Number.isFinite(p) || p <= 0) {
      toast.warning("Product details", "Name, category, and a valid price are required.");
      return;
    }
    setStreaming(true);
    setBuffer("");
    setVariants([]);
    try {
      const res = await fetch("/api/social/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          category: category.trim(),
          price: p,
          colors: colors.split(",").map((s) => s.trim()).filter(Boolean),
          sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
          fabric: fabric.trim() || undefined,
          language,
          tone,
          includeHashtags: true,
          sellerCity: "Surat",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Generation failed");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setBuffer(acc);
        const parsed = tryParseCaptionsJson(acc);
        if (parsed?.length) setVariants(parsed);
      }
      const finalParsed = tryParseCaptionsJson(acc);
      if (!finalParsed?.length) {
        toast.error("Parse error", "Could not read AI response as JSON. Try again.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      toast.error(msg);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">AI captions (Gemini)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-text-tertiary">Product name</label>
          <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Category</label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Price (₹)</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} step={1} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Colors (comma-separated)</label>
          <Input value={colors} onChange={(e) => setColors(e.target.value)} className="mt-1" placeholder="Maroon, Gold" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Sizes (comma-separated)</label>
          <Input value={sizes} onChange={(e) => setSizes(e.target.value)} className="mt-1" placeholder="M, L, XL" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Fabric (optional)</label>
          <Input value={fabric} onChange={(e) => setFabric(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["hinglish", "hindi", "english"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              language === l ? "border-purple-500/40 bg-purple-500/10 text-purple-200" : "border-white/[0.08] text-text-secondary"
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["casual", "urgent", "festive", "premium"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              tone === t ? "border-purple-500/40 bg-purple-500/10 text-purple-200" : "border-white/[0.08] text-text-secondary"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <Button type="button" onClick={() => void generate()} disabled={streaming} className="gap-2">
        {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate captions
      </Button>

      {streaming && buffer && !variants.length ? (
        <pre className="max-h-32 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-text-tertiary">{buffer.slice(-800)}</pre>
      ) : null}

      {variants.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {variants.map((v) => (
            <div key={v.id} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
              <div className="text-[10px] font-semibold uppercase text-text-tertiary">{v.tone}</div>
              <p className="mt-2 text-sm leading-snug text-text-primary">{v.caption}</p>
              <p className="mt-1 text-[10px] text-text-tertiary">{v.caption.length} chars</p>
              <button
                type="button"
                className="mt-2 text-[11px] font-medium text-purple-400 hover:text-purple-300"
                onClick={() => setExpandedId((id) => (id === v.id ? null : v.id))}
              >
                {expandedId === v.id ? "Hide hashtags" : "Show hashtags"}
              </button>
              {expandedId === v.id ? (
                <p className="mt-1 break-all text-[10px] text-text-secondary">
                  {(v.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => onSelect(v.caption, v.hashtags ?? [])}
              >
                Use this caption
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
