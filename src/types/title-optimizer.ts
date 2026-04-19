export type TitlePlatform = "amazon" | "flipkart" | "meesho" | "instagram";
export type TitleLanguage = "hinglish" | "hindi" | "english";
export type OutputType = "title_and_desc" | "title_only" | "keywords";

export const PLATFORM_CONFIG: Record<
  TitlePlatform,
  {
    label: string;
    charLimit: number | null;
    limitLabel: string;
  }
> = {
  amazon: { label: "Amazon", charLimit: 200, limitLabel: "200 chars" },
  flipkart: { label: "Flipkart", charLimit: 255, limitLabel: "255 chars" },
  meesho: { label: "Meesho", charLimit: 100, limitLabel: "100 chars" },
  instagram: { label: "Instagram", charLimit: null, limitLabel: "Caption" },
};

export interface TitleFormData {
  productName: string;
  category: string;
  price: number;
  catalogProductId?: string;
  variants: string[];
  currentTitle?: string;
  platforms: TitlePlatform[];
  language: TitleLanguage;
  outputType: OutputType;
  includeCompetitorAnalysis: boolean;
}

export interface GeneratedTitleResult {
  platform: TitlePlatform;
  title: string;
  charCount: number;
  charLimit: number | null;
  description?: string;
  keywords?: string[];
  beforeScore?: number;
  afterScore?: number;
  competitorInsights?: string[];
}

export interface TitleOptimizationRecord {
  id: string;
  sellerId: string;
  productName: string;
  platforms: TitlePlatform[];
  results: GeneratedTitleResult[];
  createdAt: Date;
}

