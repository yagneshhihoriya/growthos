"use client";

import * as React from "react";
import { FlaskConical, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ChipMultiSelect } from "@/components/ui/ChipMultiSelect";
import { cn } from "@/lib/utils";
import {
  allCategoryOptions,
  FIELDS_BY_CATEGORY,
  SUPER_CATEGORY_LABELS,
} from "@/lib/title-optimizer-categories";
import {
  detectProductSuperCategory,
  type CompetitorAnalysis,
  type PlatformKey,
  type SuperCategory,
} from "@/lib/title-pipeline";
import { CategoryPicker } from "@/components/titles/CategoryPicker";
import { TitleScoreCard, type ScorePayload } from "@/components/titles/TitleScoreCard";
import { TitleResultCard } from "@/components/titles/TitleResultCard";
import { KeywordList } from "@/components/titles/KeywordList";
import { CompetitorInsights } from "@/components/titles/CompetitorInsights";

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

export type OptimizeSuccessPayload = {
  optimizationId: string;
  productId: string | null;
  originalTitle: string | null;
  optimizedTitles: Record<string, string>;
};

export function TitleOptimizerForm(props?: {
  onSuccess?: (payload: OptimizeSuccessPayload) => void;
  /** Opens A/B tab; prefill is set via onSuccess — call after a successful run. */
  onRequestAbTest?: () => void;
}) {
  const { onSuccess, onRequestAbTest } = props ?? {};
  const toast = useToast();
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [productId, setProductId] = React.useState<string>("");
  const [productName, setProductName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [selectedSuperCategory, setSelectedSuperCategory] = React.useState<SuperCategory | null>(null);
  const [price, setPrice] = React.useState("");
  const [currentTitle, setCurrentTitle] = React.useState("");
  const [language, setLanguage] = React.useState<"hinglish" | "hindi" | "english">("hinglish");
  const [includeCompetitor, setIncludeCompetitor] = React.useState(true);
  const [colors, setColors] = React.useState("");
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [fabric, setFabric] = React.useState("");
  const [occasion, setOccasion] = React.useState<string[]>([]);
  const [ingredients, setIngredients] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [dimensions, setDimensions] = React.useState("");
  const [specRows, setSpecRows] = React.useState<SpecRow[]>([{ key: "", value: "" }]);
  const [submitting, setSubmitting] = React.useState(false);

  const [optimizationId, setOptimizationId] = React.useState<string | null>(null);
  const [appliedPlatforms, setAppliedPlatforms] = React.useState<string[]>([]);
  const [originalScore, setOriginalScore] = React.useState<ScorePayload | null>(null);
  const [optimizedScore, setOptimizedScore] = React.useState<ScorePayload | null>(null);
  const [improvement, setImprovement] = React.useState<number | null>(null);
  const [titles, setTitles] = React.useState<Partial<Record<PlatformKey, string>> | null>(null);
  const [description, setDescription] = React.useState("");
  const [bulletPoints, setBulletPoints] = React.useState<string[]>([]);
  const [keywords, setKeywords] = React.useState<import("@/lib/title-pipeline").KeywordRow[]>([]);
  const [competitor, setCompetitor] = React.useState<CompetitorAnalysis | null>(null);
  const [superCategoryLabel, setSuperCategoryLabel] = React.useState("");

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

  function splitList(s: string): string[] {
    return s
      .split(/[,|]/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function submit() {
    const p = parseFloat(price);
    if (!productName.trim() || !category.trim() || !Number.isFinite(p) || p <= 0) {
      toast.warning("Required", "Product name, category, and a valid price are required.");
      return;
    }
    setSubmitting(true);
    setOptimizationId(null);
    setTitles(null);
    setDescription("");
    setBulletPoints([]);
    setKeywords([]);
    setCompetitor(null);
    setOriginalScore(null);
    setOptimizedScore(null);
    setImprovement(null);
    setAppliedPlatforms([]);
    try {
      const body: Record<string, unknown> = {
        productName: productName.trim(),
        category: category.trim(),
        price: p,
        colors: splitList(colors),
        sizes: sizes.map((s) => s.trim()).filter(Boolean),
        occasion: occasion.map((s) => s.trim()).filter(Boolean),
        fabric: fabric.trim() || undefined,
        ingredients: ingredients.trim() || undefined,
        weight: weight.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        specs: specsToRecord(),
        currentTitle: currentTitle.trim() || undefined,
        language,
        includeCompetitorAnalysis: includeCompetitor,
      };
      if (productId) body.productId = productId;

      const res = await fetch("/api/titles/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        optimization?: {
          id: string;
          optimizedTitles: Record<string, string>;
          appliedPlatforms: string[];
          isApplied: boolean;
          keywordData?: import("@/lib/title-pipeline").KeywordRow[];
          competitorAnalysis?: CompetitorAnalysis | null;
          description?: string | null;
          bulletPoints?: string[];
        };
        originalScore?: ScorePayload | null;
        optimizedScore?: ScorePayload;
        improvement?: number | null;
      };
      if (!res.ok) throw new Error(json.error ?? "Optimization failed");

      const opt = json.optimization;
      if (!opt) throw new Error("No optimization returned");

      setOptimizationId(opt.id);
      setTitles(opt.optimizedTitles as Partial<Record<PlatformKey, string>>);
      setDescription(opt.description ?? "");
      setBulletPoints(Array.isArray(opt.bulletPoints) ? opt.bulletPoints : []);
      setKeywords(Array.isArray(opt.keywordData) ? opt.keywordData : []);
      setCompetitor(opt.competitorAnalysis ?? null);
      setAppliedPlatforms(Array.isArray(opt.appliedPlatforms) ? opt.appliedPlatforms : []);
      setOriginalScore(json.originalScore ?? null);
      setOptimizedScore(json.optimizedScore ?? null);
      setImprovement(typeof json.improvement === "number" ? json.improvement : null);
      setSuperCategoryLabel(superCategory);
      toast.success("Ready", "Titles and description generated.");
      onSuccess?.({
        optimizationId: opt.id,
        productId: productId ? productId : null,
        originalTitle: currentTitle.trim() || null,
        optimizedTitles: opt.optimizedTitles as Record<string, string>,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const platformOrder: PlatformKey[] = ["amazon", "flipkart", "meesho", "instagram"];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Product</p>
        <div className="mt-3 space-y-4">
          <div>
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
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1" placeholder="e.g. Cotton Kurti Set" />
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
            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" type="number" min={1} step="1" placeholder="499" />
          </div>
          <div>
            <label className="text-xs text-text-tertiary">Current title (optional — for before score)</label>
            <textarea
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm text-text-primary focus:border-purple-500/30 focus:outline-none"
              placeholder="Paste your live marketplace title…"
            />
          </div>
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          Details ({SUPER_CATEGORY_LABELS[superCategory]})
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {visibleFields.includes("colors") ? (
            <div className="sm:col-span-2">
              <label className="text-xs text-text-tertiary">Colors / variants (comma-separated)</label>
              <Input value={colors} onChange={(e) => setColors(e.target.value)} className="mt-1" placeholder="Maroon, Navy, Black" />
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
                  <Input placeholder="Name" value={row.key} onChange={(e) => {
                    const next = [...specRows];
                    next[i] = { ...next[i], key: e.target.value };
                    setSpecRows(next);
                  }} />
                  <Input placeholder="Value" value={row.value} onChange={(e) => {
                    const next = [...specRows];
                    next[i] = { ...next[i], value: e.target.value };
                    setSpecRows(next);
                  }} />
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => setSpecRows([...specRows, { key: "", value: "" }])}>
                + Add spec
              </Button>
            </div>
          ) : null}
          {visibleFields.includes("ingredients") ? (
            <div className="sm:col-span-2">
              <label className="text-xs text-text-tertiary">Ingredients / composition</label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm"
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

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Language & options</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["hinglish", "hindi", "english"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                language === lang ? "border-purple-500/40 bg-purple-500/15 text-purple-200" : "border-white/[0.08] text-text-secondary"
              )}
            >
              {lang}
            </button>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={includeCompetitor} onChange={(e) => setIncludeCompetitor(e.target.checked)} className="rounded border-white/20" />
          Include competitor analysis (Meesho + AI summary)
        </label>

        <Button
          type="button"
          className="mt-6 w-full gap-2 sm:w-auto"
          disabled={submitting}
          onClick={() => void submit()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {submitting ? "Generating…" : "Generate titles & description (15–30s)"}
        </Button>
      </div>

      {titles && optimizedScore && optimizationId ? (
        <div className="space-y-6">
          {improvement != null ? (
            <p className="text-sm text-text-tertiary">
              Super-category: <span className="font-medium text-text-primary">{superCategoryLabel}</span>
              {improvement !== 0 ? (
                <>
                  {" "}
                  · Improvement:{" "}
                  <span className={cn("font-semibold", improvement > 0 ? "text-emerald-400" : "text-red-400")}>
                    {improvement > 0 ? "+" : ""}
                    {improvement} pts
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-text-tertiary">
              Super-category: <span className="font-medium text-text-primary">{superCategoryLabel}</span>
            </p>
          )}

          <TitleScoreCard originalScore={originalScore} optimizedScore={optimizedScore} />

          <div className="grid gap-3 md:grid-cols-2">
            {platformOrder.map((pf) => (
              <TitleResultCard
                key={pf}
                platform={pf}
                title={typeof titles[pf] === "string" ? titles[pf]! : ""}
                optimizationId={optimizationId}
                appliedPlatforms={appliedPlatforms}
                onAppliedPlatformsChange={(next) => {
                  setAppliedPlatforms(next);
                }}
              />
            ))}
          </div>

          <KeywordList keywords={keywords} />
          {includeCompetitor ? <CompetitorInsights data={competitor} /> : null}

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{description}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Bullet points</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-primary">
              {bulletPoints.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          {onRequestAbTest ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm text-text-secondary">
                Compare your previous listing title with an optimized title using manual order tracking (no marketplace click APIs).
              </p>
              <Button type="button" variant="secondary" className="mt-3 gap-2" onClick={() => onRequestAbTest()}>
                <FlaskConical className="h-4 w-4" />
                Start A/B test
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
