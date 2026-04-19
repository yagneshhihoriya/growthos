export type Platform = "instagram" | "facebook" | "both" | "whatsapp";
export type Language = "hinglish" | "hindi" | "english";
export type Tone = "casual" | "urgent" | "festive" | "premium";
export type CaptionLength = "short" | "medium" | "long";
export type HashtagMode = "full" | "minimal" | "none";
export type CtaType = "dm" | "whatsapp" | "link_in_bio" | "shop_now";
export type CaptionCount = 1 | 3 | 5;

export type TargetAudience =
  | "women_18_24"
  | "women_25_35"
  | "women_35_plus"
  | "men"
  | "mothers"
  | "budget_buyers"
  | "gifting";

export interface CaptionFormData {
  productName: string;
  category: string;
  price: number;
  offer?: string;
  variants: string[];
  platform: Platform;
  language: Language;
  tone: Tone;
  targetAudience: TargetAudience[];
  usp?: string;
  cta: CtaType;
  captionLength: CaptionLength;
  hashtagMode: HashtagMode;
  captionCount: CaptionCount;
}

export interface CaptionTemplate {
  id: string;
  sellerId: string;
  name: string;
  settings: Omit<CaptionFormData, "productName" | "category" | "price" | "offer" | "variants" | "usp">;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedCaption {
  id: string;
  text: string;
  hashtags: string[];
  platform: Platform;
  charCount: number;
}

export type CaptionVariant = {
  id: number;
  tone: string;
  caption: string;
  hashtags: string[];
};
