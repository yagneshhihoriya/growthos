import { z } from "zod";

const audienceEnum = z.enum([
  "women_18_24",
  "women_25_35",
  "women_35_plus",
  "men",
  "mothers",
  "budget_buyers",
  "gifting",
]);

const superCategoryEnum = z.enum([
  "clothing",
  "electronics",
  "beauty",
  "footwear",
  "bags",
  "jewellery",
  "home",
  "food",
  "health",
  "kids",
  "stationery",
  "pets",
  "general",
]);

/** Value type for dynamic category-specific fields (keys vary per category). */
const categoryFieldValue = z.union([z.string(), z.number(), z.array(z.string())]);

export const CaptionFormSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(100),
  category: z.string().min(1, "Category is required").max(100),
  /** Super-category derived from the dropdown pick — drives dynamic fields + prompt. */
  categorySuper: superCategoryEnum.optional(),
  /** Flexible bag of category-specific fields (sizes, fabric, specs, etc.). */
  categoryFields: z.record(z.string(), categoryFieldValue).optional(),
  price: z.coerce.number({ invalid_type_error: "Price must be a number" }).positive("Price must be greater than 0"),
  offer: z.string().max(200).optional(),
  variants: z.array(z.string().max(50)).max(20),

  platform: z.enum(["instagram", "facebook", "both", "whatsapp"]),
  language: z.enum(["hinglish", "hindi", "english"]),
  tone: z.enum(["casual", "urgent", "festive", "premium"]),

  targetAudience: z.array(audienceEnum).min(1, "Pick at least one audience"),

  usp: z.string().max(300).optional(),
  cta: z.enum(["dm", "whatsapp", "link_in_bio", "shop_now"]),
  captionLength: z.enum(["short", "medium", "long"]),
  hashtagMode: z.enum(["full", "minimal", "none"]),
  captionCount: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});

export type CaptionFormInput = z.infer<typeof CaptionFormSchema>;

export const CaptionTemplateSettingsSchema = CaptionFormSchema.omit({
  productName: true,
  category: true,
  categorySuper: true,
  categoryFields: true,
  price: true,
  offer: true,
  variants: true,
  usp: true,
});

export const CaptionTemplateBodySchema = z.object({
  name: z.string().min(1).max(50).default("My default"),
  settings: CaptionTemplateSettingsSchema,
});
