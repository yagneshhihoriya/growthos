"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ChipMultiSelect, ChipSingleSelect } from "@/components/ui/ChipMultiSelect";
import { CategoryPicker } from "@/components/titles/CategoryPicker";
import { cn } from "@/lib/utils";
import {
  allCategoryOptions,
  FIELDS_BY_CATEGORY,
  SUPER_CATEGORY_LABELS,
} from "@/lib/title-optimizer-categories";
import { detectProductSuperCategory, type SuperCategory } from "@/lib/title-pipeline";

export type CaptionVariant = {
  id: number;
  tone: string;
  caption: string;
  hashtags: string[];
};

type ProductOption = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  colors: string[];
  sizes: string[];
  fabric: string | null;
  occasion: string[];
};

type SpecRow = { key: string; value: string };

const CATEGORY_OPTIONS = allCategoryOptions();

const CLOTHING_SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
const OCCASION_PRESETS = [
  "Festive",
  "Wedding",
  "Party",
  "Office",
  "Daily",
  "Casual",
  "Ethnic",
  "Formal",
  "Traditional",
  "College",
  "Gifting",
] as const;
const AUDIENCE_PRESETS = [
  "Women 18-24",
  "Women 25-35",
  "Women 35+",
  "Men",
  "Mothers",
  "Gen Z",
  "Budget buyers",
  "Tier-2 India",
  "Fitness",
  "Gifting",
] as const;
const CTA_OPTIONS = ["DM to order", "WhatsApp", "Link in bio", "Shop now"] as const;
const PLATFORM_OPTIONS = ["instagram", "facebook", "both"] as const;
type PlatformTarget = (typeof PLATFORM_OPTIONS)[number];

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
      // next delta may complete it
    }
  }
  return out;
}

function tryParseCaptionsJson(buffer: string): CaptionVariant[] | null {
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
      // fall through to partial extraction
    }
  }
  const partial = extractCaptionObjects(text);
  return partial.length ? partial : null;
}

function splitList(s: string): string[] {
  return s
    .split(/[,|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function CaptionGenerator({
  onSelect,
}: {
  onSelect: (caption: string, hashtags: string[]) => void;
}) {
  const toast = useToast();

  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [productId, setProductId] = React.useState("");
  const [productName, setProductName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [selectedSuperCategory, setSelectedSuperCategory] = React.useState<SuperCategory | null>(null);
  const [price, setPrice] = React.useState("");

  // category-specific fields
  const [colors, setColors] = React.useState("");
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [fabric, setFabric] = React.useState("");
  const [occasion, setOccasion] = React.useState<string[]>([]);
  const [ingredients, setIngredients] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [dimensions, setDimensions] = React.useState("");
  const [specRows, setSpecRows] = React.useState<SpecRow[]>([{ key: "", value: "" }]);

  // marketing-angle fields (category-independent)
  const [highlight, setHighlight] = React.useState("");
  const [audience, setAudience] = React.useState<string[]>([]);
  const [offer, setOffer] = React.useState("");
  const [cta, setCta] = React.useState<string>("DM to order");
  const [platformTarget, setPlatformTarget] = React.useState<PlatformTarget>("instagram");

  const [language, setLanguage] = React.useState<"hindi" | "hinglish" | "english">("hinglish");
  const [tone, setTone] = React.useState<"casual" | "urgent" | "festive" | "premium">("casual");

  const [streaming, setStreaming] = React.useState(false);
  const [buffer, setBuffer] = React.useState("");
  const [variants, setVariants] = React.useState<CaptionVariant[]>([]);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

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

  const superCategory: SuperCategory = React.useMemo(() => {
    if (selectedSuperCategory) return selectedSuperCategory;
    const match = CATEGORY_OPTIONS.find(
      (o) => o.label.toLowerCase() === category.trim().toLowerCase()
    );
    if (match) return match.group;
    return detectProductSuperCategory(category || "general", productName || category || "x");
  }, [selectedSuperCategory, category, productName]);
  const visibleFields = FIELDS_BY_CATEGORY[superCategory] ?? FIELDS_BY_CATEGORY.general;

  function applyProduct(p: ProductOption) {
    setProductId(p.id);
    setProductName(p.name);
    const cat = p.category ?? "";
    setCategory(cat);
    const match = CATEGORY_OPTIONS.find((o) => o.label.toLowerCase() === cat.trim().toLowerCase());
    setSelectedSuperCategory(match ? match.group : null);
    if (p.price != null) setPrice(String(p.price));
    setColors(p.colors.join(", "));
    setSizes(Array.isArray(p.sizes) ? p.sizes : []);
    setFabric(p.fabric ?? "");
    setOccasion(Array.isArray(p.occasion) ? p.occasion : []);
  }

  function specsToRecord(): Record<string, string> | undefined {
    const o: Record<string, string> = {};
    for (const r of specRows) {
      const k = r.key.trim();
      if (k) o[k] = r.value.trim();
    }
    return Object.keys(o).length ? o : undefined;
  }

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
      const body: Record<string, unknown> = {
        productName: productName.trim(),
        category: category.trim(),
        superCategory,
        price: p,
        colors: splitList(colors),
        sizes: sizes.map((s) => s.trim()).filter(Boolean),
        occasion: occasion.map((s) => s.trim()).filter(Boolean),
        fabric: fabric.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        weight: weight.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        specs: specsToRecord(),
        highlight: highlight.trim() || undefined,
        audience: audience.length ? audience : undefined,
        offer: offer.trim() || undefined,
        cta: cta || undefined,
        platformTarget,
        language,
        tone,
        includeHashtags: true,
        sellerCity: "Surat",
      };
      if (productId) body.productId = productId;

      const res = await fetch("/api/social/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <div className="sm:col-span-2">
          <label className="text-xs text-text-tertiary">Link catalog product (optional)</label>
          <select
            className="mt-1 w-full rounded-lg border border-white/[0.1] bg-black/30 px-3 py-2 text-sm text-text-primary"
            value={productId}
            onChange={(e) => {
              const id = e.target.value;
              setProductId(id);
              if (!id) return;
              const p = products.find((x) => x.id === id);
              if (p) applyProduct(p);
            }}
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
          <label className="text-xs text-text-tertiary">Product name *</label>
          <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1" />
        </div>
        <CategoryPicker
          value={category}
          onChange={(label, sc) => {
            setCategory(label);
            setSelectedSuperCategory(sc);
          }}
          detectedSuperCategory={superCategory}
        />
        <div>
          <label className="text-xs text-text-tertiary">Price (₹) *</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} step={1} className="mt-1" />
        </div>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
        Details ({SUPER_CATEGORY_LABELS[superCategory]})
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleFields.includes("colors") ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Colors / variants (comma-separated)</label>
            <Input value={colors} onChange={(e) => setColors(e.target.value)} className="mt-1" placeholder="Maroon, Gold" />
          </div>
        ) : null}
        {visibleFields.includes("sizes") ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Sizes</label>
            {superCategory === "clothing" || superCategory === "kids" ? (
              <ChipMultiSelect
                className="mt-1"
                options={CLOTHING_SIZE_PRESETS}
                value={sizes}
                onChange={setSizes}
                variant="amber"
              />
            ) : (
              <Input
                value={sizes.join(", ")}
                onChange={(e) => setSizes(splitList(e.target.value))}
                className="mt-1"
                placeholder="e.g. 7, 8, 9, 10"
              />
            )}
          </div>
        ) : null}
        {visibleFields.includes("fabric") ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Fabric / material</label>
            <Input value={fabric} onChange={(e) => setFabric(e.target.value)} className="mt-1" placeholder="100% cotton" />
          </div>
        ) : null}
        {visibleFields.includes("occasion") ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Occasion</label>
            <ChipMultiSelect className="mt-1" options={OCCASION_PRESETS} value={occasion} onChange={setOccasion} />
          </div>
        ) : null}
        {visibleFields.includes("specs") ? (
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs text-text-tertiary">Key specs</label>
            {specRows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={row.key}
                  onChange={(e) => {
                    const next = [...specRows];
                    next[i] = { ...next[i], key: e.target.value };
                    setSpecRows(next);
                  }}
                />
                <Input
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => {
                    const next = [...specRows];
                    next[i] = { ...next[i], value: e.target.value };
                    setSpecRows(next);
                  }}
                />
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" onClick={() => setSpecRows([...specRows, { key: "", value: "" }])}>
              + Add spec
            </Button>
          </div>
        ) : null}
        {visibleFields.includes("ingredients") ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-text-tertiary">Ingredients / composition / benefits</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-text-primary"
              placeholder="Vitamin C 10%, Hyaluronic acid, niacinamide…"
            />
          </div>
        ) : null}
        {visibleFields.includes("weight") ? (
          <div>
            <label className="text-xs text-text-tertiary">Weight / volume</label>
            <Input value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1" placeholder="50ml, 200g" />
          </div>
        ) : null}
        {visibleFields.includes("dimensions") ? (
          <div>
            <label className="text-xs text-text-tertiary">Dimensions</label>
            <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="mt-1" placeholder="30 x 20 x 10 cm" />
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Marketing angle</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs text-text-tertiary">Key highlight / USP (1 line AI should emphasize)</label>
          <Input
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            className="mt-1"
            placeholder="e.g. Smudge-proof 24 hrs / 8hr battery / Handloom by rural artisans"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-text-tertiary">Target audience</label>
          <ChipMultiSelect className="mt-1" options={AUDIENCE_PRESETS} value={audience} onChange={setAudience} />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Offer / discount (optional)</label>
          <Input value={offer} onChange={(e) => setOffer(e.target.value)} className="mt-1" placeholder="30% off till Sunday, Free COD" />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">Call to action</label>
          <ChipSingleSelect className="mt-1" options={CTA_OPTIONS} value={cta} onChange={setCta} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-text-tertiary">Primary platform</label>
          <ChipSingleSelect
            className="mt-1"
            options={PLATFORM_OPTIONS}
            value={platformTarget}
            onChange={setPlatformTarget}
            capitalize
          />
        </div>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Language & tone</p>
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
