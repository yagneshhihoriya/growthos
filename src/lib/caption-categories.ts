/**
 * Caption form — extra-field config per super-category.
 *
 * We reuse the Title Optimizer's existing category data
 * (`src/lib/title-optimizer-categories.ts`) as the single source of truth
 * for category labels and groupings; this file only adds the *rendering*
 * descriptors for the dynamic fields shown in the Captions form.
 *
 * `colors` is intentionally omitted — the Captions form already has a
 * "Colors / variants" TagInput that covers that slot across every category.
 */

import type { SuperCategory } from "@/lib/title-pipeline";

export type CategoryFieldType = "text" | "number" | "tags" | "pills" | "fabric";

export interface CategoryField {
  /** Key under `categoryFields` in the form state. */
  name: string;
  label: string;
  placeholder?: string;
  type: CategoryFieldType;
  /** Preset suggestions (for `pills`). */
  options?: string[];
  /** Trailing unit shown inside `number` inputs (e.g. "g", "ml", "inch"). */
  unit?: string;
  /** Optional short hint rendered below the control. */
  hint?: string;
}

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const FOOTWEAR_SIZES = ["5", "6", "7", "8", "9", "10", "11"];
const KIDS_SIZES = ["0-6M", "6-12M", "1-2Y", "2-3Y", "4-5Y", "6-8Y", "9-12Y"];
const OCCASIONS_CLOTHING = ["Daily", "Office", "Party", "Wedding", "Festive", "Casual"];
const OCCASIONS_FOOTWEAR = ["Daily", "Formal", "Sports", "Party", "Festive"];
const OCCASIONS_JEWELLERY = ["Daily", "Office", "Party", "Wedding", "Festive"];

export const CAPTION_EXTRA_FIELDS_BY_GROUP: Record<SuperCategory, CategoryField[]> = {
  clothing: [
    { name: "sizes", label: "Sizes", type: "pills", options: CLOTHING_SIZES, hint: "Tap sizes that are in stock." },
    { name: "fabric", label: "Fabric / material", type: "fabric", placeholder: "e.g. Pure silk, 100% cotton" },
    { name: "occasion", label: "Occasion", type: "pills", options: OCCASIONS_CLOTHING },
  ],
  footwear: [
    { name: "sizes", label: "Sizes (UK/IND)", type: "pills", options: FOOTWEAR_SIZES },
    { name: "occasion", label: "Occasion", type: "pills", options: OCCASIONS_FOOTWEAR },
  ],
  jewellery: [
    { name: "occasion", label: "Occasion", type: "pills", options: OCCASIONS_JEWELLERY },
    { name: "weight", label: "Weight", type: "text", placeholder: "e.g. 12g", unit: "g" },
  ],
  bags: [
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 30 × 20 × 10 cm" },
  ],
  electronics: [
    { name: "specs", label: "Key specs", type: "text", placeholder: "e.g. 1.5-ton, 5-star, inverter" },
    { name: "weight", label: "Weight", type: "text", placeholder: "e.g. 1.2 kg" },
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 35 × 25 × 10 cm" },
  ],
  beauty: [
    { name: "ingredients", label: "Hero ingredients", type: "tags", placeholder: "e.g. Vitamin C, Hyaluronic acid" },
    { name: "weight", label: "Size / quantity", type: "text", placeholder: "e.g. 50 ml, 100 g" },
  ],
  home: [
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 180 × 75 cm" },
    { name: "weight", label: "Weight", type: "text", placeholder: "e.g. 5 kg" },
  ],
  food: [
    { name: "ingredients", label: "Main ingredients", type: "tags", placeholder: "e.g. Almonds, Cashews" },
    { name: "weight", label: "Pack size", type: "text", placeholder: "e.g. 500 g, 1 kg" },
  ],
  health: [
    { name: "ingredients", label: "Key ingredients", type: "tags", placeholder: "e.g. Ashwagandha, Whey isolate" },
    { name: "weight", label: "Pack size", type: "text", placeholder: "e.g. 60 tablets, 1 kg" },
  ],
  kids: [
    { name: "sizes", label: "Age / size", type: "pills", options: KIDS_SIZES },
  ],
  stationery: [],
  pets: [
    { name: "weight", label: "Pack size", type: "text", placeholder: "e.g. 1.2 kg" },
    { name: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 40 × 30 cm" },
  ],
  general: [],
};

/** Human labels used when rendering the extra fields inside the AI prompt. */
export const CATEGORY_FIELD_LABELS: Record<string, string> = {
  sizes: "Available sizes",
  fabric: "Fabric / material",
  occasion: "Occasion",
  specs: "Key specs",
  weight: "Weight / pack size",
  dimensions: "Dimensions",
  ingredients: "Key ingredients",
};

export function getCaptionExtraFields(superCategory: SuperCategory | null | undefined): CategoryField[] {
  if (!superCategory) return [];
  return CAPTION_EXTRA_FIELDS_BY_GROUP[superCategory] ?? [];
}
