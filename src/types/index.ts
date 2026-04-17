export type MarketplaceSizeName =
  | "amazon"
  | "flipkart"
  | "meesho"
  | "instagram"
  | "story"
  | "whatsapp"
  | "pinterest"
  | "transparent";

export type BackgroundType =
  | "transparent"
  | "white"
  | "grey"
  | "gradient"
  | "diwali"
  | "navratri"
  | "outdoor"
  | "studio"
  | "custom"
  | "brand"
  | "ai";

export interface BrandBgOptions {
  hex: string;
  style: "solid" | "gradient";
  gradientDirection?: "to-right" | "to-bottom" | "radial";
}

export interface ImageProcessOptions {
  removeBackground: boolean;
  enhance: boolean;
  watermark: boolean;
  bgType: BackgroundType;
  customBgHex?: string;
  aiPrompt?: string;
  brandBg?: BrandBgOptions;
  sizes: MarketplaceSizeName[];
  watermarkPresetId?: string | null;
}

export interface PresetBackground {
  id: BackgroundType;
  label: string;
  description: string;
  category: "basic" | "festive" | "scene" | "custom";
  preview: {
    type: "solid" | "gradient" | "pattern";
    colors: string[];
    direction?: string;
  };
}

export interface BatchStatusJob {
  id: string;
  status: string;
  originalUrl: string;
  errorMsg: string | null;
  processedUrls: Record<string, string> | null;
}

export interface BatchStatusResponse {
  batchId: string;
  total: number;
  processed: number;
  failed: number;
  status: string;
  zipUrl: string | null;
  zipExpiresAt: string | null;
  jobs: BatchStatusJob[];
}
