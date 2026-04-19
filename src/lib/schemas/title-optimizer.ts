import { z } from "zod";

const platformEnum = z.enum(["amazon", "flipkart", "meesho", "instagram"]);

export const TitleFormSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(150),
  category: z.string().min(1, "Category is required").max(100),
  price: z.coerce.number({ invalid_type_error: "Price must be a number" }).positive("Price must be greater than 0"),

  catalogProductId: z.union([z.string().cuid(), z.literal("")]).optional().transform((s) => (s === "" ? undefined : s)),

  variants: z.array(z.string().max(50)).max(20),
  currentTitle: z.string().max(500).optional(),

  platforms: z.array(platformEnum).min(1, "Select at least one platform").max(4),

  language: z.enum(["hinglish", "hindi", "english"]),
  outputType: z.enum(["title_and_desc", "title_only", "keywords"]),

  includeCompetitorAnalysis: z.boolean(),
});

export type TitleFormInput = z.infer<typeof TitleFormSchema>;
