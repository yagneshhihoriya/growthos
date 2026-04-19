export type ImageStyle =
  | "white_bg"
  | "lifestyle_wood"
  | "lifestyle_marble"
  | "lifestyle_outdoor"
  | "festive_diwali"
  | "festive_wedding"
  | "close_up"
  | "infographic"
  | "minimal_gray";

export type ProductCategory =
  | "clothing"
  | "jewellery"
  | "electronics"
  | "beauty"
  | "footwear"
  | "bags"
  | "home_decor"
  | "food"
  | "general";

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
  infographic: {
    value: "infographic",
    label: "Feature callouts",
    description: "Clean infographic style with labels highlighting key features",
    icon: "📋",
    bestFor: "Amazon feature images",
    platformBadges: ["Amazon", "Flipkart"],
  },
  minimal_gray: {
    value: "minimal_gray",
    label: "Minimal gray",
    description: "Soft light gray background with subtle shadow — clean and modern",
    icon: "▫️",
    bestFor: "Secondary listing images",
    platformBadges: ["Amazon", "Flipkart", "Meesho"],
  },
};

export const AMAZON_LISTING_PRESET: ImageStyle[] = [
  "white_bg",
  "minimal_gray",
  "close_up",
  "lifestyle_wood",
  "infographic",
];

export const INSTAGRAM_PRESET: ImageStyle[] = [
  "lifestyle_wood",
  "lifestyle_marble",
  "festive_diwali",
];

export const FULL_PRESET: ImageStyle[] = [
  "white_bg",
  "lifestyle_wood",
  "lifestyle_marble",
  "close_up",
  "infographic",
];

export const PRODUCT_CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "clothing", label: "Clothing (Kurti, Saree, Suit…)" },
  { value: "jewellery", label: "Jewellery (Necklace, Earrings…)" },
  { value: "electronics", label: "Electronics (Watch, Phone, Earbuds…)" },
  { value: "beauty", label: "Beauty (Cream, Lipstick, Skincare…)" },
  { value: "footwear", label: "Footwear (Shoes, Sandals, Heels…)" },
  { value: "bags", label: "Bags (Handbag, Purse, Backpack…)" },
  { value: "home_decor", label: "Home decor (Diyas, Frames, Cushions…)" },
  { value: "food", label: "Food (Dry fruits, Snacks, Spices…)" },
  { value: "general", label: "General / Other" },
];
