export type ImageStyle =
  | "white_bg"
  | "lifestyle_wood"
  | "lifestyle_marble"
  | "lifestyle_outdoor"
  | "festive_diwali"
  | "festive_wedding"
  | "close_up"
  | "close_up_front"
  | "infographic";

export type ProductCategory =
  // Fashion
  | "clothing_kurti"
  | "clothing_saree"
  | "clothing_western"
  | "clothing_kids"
  // Accessories
  | "jewellery_gold"
  | "jewellery_fashion"
  | "bags_handbag"
  | "bags_backpack"
  | "footwear_heels"
  | "footwear_casual"
  // Electronics
  | "electronics_watch"
  | "electronics_phone"
  | "electronics_audio"
  | "electronics_gadget"
  // Beauty & Health
  | "beauty_skincare"
  | "beauty_makeup"
  | "beauty_haircare"
  // Home & Food
  | "home_decor"
  | "food_packaged"
  | "general";

export const PRODUCT_CATEGORY_VALUES: readonly ProductCategory[] = [
  "clothing_kurti",
  "clothing_saree",
  "clothing_western",
  "clothing_kids",
  "jewellery_gold",
  "jewellery_fashion",
  "bags_handbag",
  "bags_backpack",
  "footwear_heels",
  "footwear_casual",
  "electronics_watch",
  "electronics_phone",
  "electronics_audio",
  "electronics_gadget",
  "beauty_skincare",
  "beauty_makeup",
  "beauty_haircare",
  "home_decor",
  "food_packaged",
  "general",
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  clothing_kurti: "Kurti / Salwar / Suit",
  clothing_saree: "Saree / Lehenga / Dupatta",
  clothing_western: "Western wear (T-shirt, Dress, Jeans)",
  clothing_kids: "Kids clothing",
  jewellery_gold: "Gold jewellery (Necklace, Bangles)",
  jewellery_fashion: "Fashion jewellery (Artificial)",
  bags_handbag: "Handbag / Clutch / Purse",
  bags_backpack: "Backpack / Travel bag",
  footwear_heels: "Heels / Wedges / Sandals",
  footwear_casual: "Sneakers / Flats / Chappal",
  electronics_watch: "Watch (Smart / Analog)",
  electronics_phone: "Mobile / Tablet",
  electronics_audio: "Earbuds / Headphones / Speaker",
  electronics_gadget: "Electronics / Gadgets (Other)",
  beauty_skincare: "Skincare (Cream, Serum, Moisturiser)",
  beauty_makeup: "Makeup (Lipstick, Kajal, Foundation)",
  beauty_haircare: "Haircare (Oil, Shampoo, Mask)",
  home_decor: "Home decor (Diya, Frame, Cushion)",
  food_packaged: "Food & Snacks (Dry fruits, Spices)",
  general: "General / Other",
};

export const CATEGORY_GROUPS: ReadonlyArray<{
  label: string;
  categories: ProductCategory[];
}> = [
  {
    label: "Fashion",
    categories: ["clothing_kurti", "clothing_saree", "clothing_western", "clothing_kids"],
  },
  {
    label: "Accessories",
    categories: [
      "jewellery_gold",
      "jewellery_fashion",
      "bags_handbag",
      "bags_backpack",
      "footwear_heels",
      "footwear_casual",
    ],
  },
  {
    label: "Electronics",
    categories: [
      "electronics_watch",
      "electronics_phone",
      "electronics_audio",
      "electronics_gadget",
    ],
  },
  {
    label: "Beauty & Health",
    categories: ["beauty_skincare", "beauty_makeup", "beauty_haircare"],
  },
  {
    label: "Home & Food",
    categories: ["home_decor", "food_packaged", "general"],
  },
];

/**
 * Result of a background Gemini Vision pass on the uploaded product image.
 * Used to tailor the prompt for each style during multi-image generation.
 *
 * All fields are best-effort — the hook/API treat a failed analysis as
 * `null` and generation proceeds normally without it.
 */
export interface ProductAnalysis {
  productType: string;
  category: ProductCategory;
  priceSegment: "budget" | "mid" | "premium" | "luxury";
  primaryColor: string;
  keyFeatures: string[];
  targetGender: "men" | "women" | "unisex" | "kids";
  photographyNotes: {
    idealAngle: string;
    lightingStyle: string;
    backgroundRecommendation: string;
    commonMistakes: string;
    amazonTopSellersUse: string;
  };
  styleRecommendations: Partial<Record<ImageStyle, string>>;
  doNotInclude: string[];
  confidence: number;
}

export type AnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; analysis: ProductAnalysis }
  | { status: "failed" };

export interface ImageStyleConfig {
  value: ImageStyle;
  label: string;
  description: string;
  icon: string;
  bestFor: string;
  platformBadges: string[];
}

export interface GeneratedImageResult {
  style: ImageStyle;
  imageUrl: string;
  jobId?: string;
  prompt?: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

export const IMAGE_STYLE_CONFIG: Record<ImageStyle, ImageStyleConfig> = {
  white_bg: {
    value: "white_bg",
    label: "White background",
    description: "Pure white studio background — required for Amazon main image",
    icon: "⬜",
    bestFor: "Amazon main image",
    platformBadges: ["Amazon", "Flipkart", "Meesho"],
  },
  lifestyle_wood: {
    value: "lifestyle_wood",
    label: "Wooden surface",
    description: "Warm wooden table with natural side lighting",
    icon: "🪵",
    bestFor: "Instagram lifestyle post",
    platformBadges: ["Instagram", "Amazon"],
  },
  lifestyle_marble: {
    value: "lifestyle_marble",
    label: "Marble surface",
    description: "Elegant white marble with soft studio lighting",
    icon: "🪨",
    bestFor: "Premium product feel",
    platformBadges: ["Instagram", "Flipkart"],
  },
  lifestyle_outdoor: {
    value: "lifestyle_outdoor",
    label: "Outdoor natural",
    description: "Natural daylight outdoor setting with soft bokeh background",
    icon: "🌿",
    bestFor: "Clothing & footwear",
    platformBadges: ["Instagram", "Amazon"],
  },
  festive_diwali: {
    value: "festive_diwali",
    label: "Festive Diwali",
    description: "Warm Diwali setting with diyas, marigolds and golden light",
    icon: "🪔",
    bestFor: "Festival season posts",
    platformBadges: ["Instagram", "Facebook"],
  },
  festive_wedding: {
    value: "festive_wedding",
    label: "Wedding occasion",
    description: "Elegant wedding setting with floral decoration and soft lighting",
    icon: "💐",
    bestFor: "Occasion & gifting products",
    platformBadges: ["Instagram", "Facebook"],
  },
  close_up: {
    value: "close_up",
    label: "Detail close-up",
    description: "Macro close-up highlighting texture, material and craftsmanship",
    icon: "🔍",
    bestFor: "Showing product quality",
    platformBadges: ["Amazon", "Flipkart"],
  },
  close_up_front: {
    value: "close_up_front",
    label: "Close-up front",
    description: "Front-facing detail shot — screen, face, or main design element",
    icon: "🔎",
    bestFor: "Amazon secondary image",
    platformBadges: ["Amazon", "Flipkart"],
  },
  infographic: {
    value: "infographic",
    label: "Feature callouts",
    description: "Clean infographic style with labels highlighting key features",
    icon: "📋",
    bestFor: "Amazon feature images",
    platformBadges: ["Amazon", "Flipkart"],
  },
};

/**
 * Map a ProductCategory into the broad "product family" so preset helpers
 * can choose sensible defaults without having a separate rule per category.
 */
type CategoryFamily =
  | "apparel"
  | "jewellery"
  | "bags"
  | "footwear"
  | "electronics"
  | "beauty"
  | "food"
  | "home"
  | "general";

function categoryFamily(category: ProductCategory): CategoryFamily {
  if (category.startsWith("clothing_")) return "apparel";
  if (category.startsWith("jewellery_")) return "jewellery";
  if (category.startsWith("bags_")) return "bags";
  if (category.startsWith("footwear_")) return "footwear";
  if (category.startsWith("electronics_")) return "electronics";
  if (category.startsWith("beauty_")) return "beauty";
  if (category === "food_packaged") return "food";
  if (category === "home_decor") return "home";
  return "general";
}

/**
 * Amazon listing preset — category-aware. Always 5 styles including a
 * lifestyle shot that suits the product family.
 */
export function getAmazonPreset(category: ProductCategory): ImageStyle[] {
  const family = categoryFamily(category);
  // Lifestyle slot is category-aware; the rest are universal:
  //   white_bg → Amazon-compliant hero
  //   close_up_front → front-facing detail (product face)
  //   close_up → side/angle detail (build quality)
  //   <lifestyle> → wood for apparel/accessories, marble otherwise
  //   infographic → feature callouts
  const lifestyle: ImageStyle =
    family === "apparel" ||
    family === "jewellery" ||
    family === "footwear" ||
    family === "bags"
      ? "lifestyle_wood"
      : family === "electronics" || family === "beauty" || family === "food"
        ? "lifestyle_marble"
        : "lifestyle_wood";
  return ["white_bg", "close_up_front", "close_up", lifestyle, "infographic"];
}

/**
 * Instagram preset — 3 lifestyle-leaning styles that look good in-feed.
 */
export function getInstagramPreset(category: ProductCategory): ImageStyle[] {
  const family = categoryFamily(category);
  if (family === "apparel" || family === "jewellery" || family === "footwear") {
    return ["lifestyle_wood", "festive_diwali", "lifestyle_outdoor"];
  }
  if (family === "electronics" || family === "beauty") {
    // close_up_front is Instagram-friendly for these families — device
    // screens and product labels look great head-on.
    return ["lifestyle_marble", "lifestyle_wood", "close_up_front"];
  }
  return ["lifestyle_wood", "lifestyle_marble", "festive_diwali"];
}

/** Static "full set" — no category dependency. */
export const FULL_PRESET: ImageStyle[] = [
  "white_bg",
  "lifestyle_wood",
  "lifestyle_marble",
  "close_up",
  "infographic",
];
