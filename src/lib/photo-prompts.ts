import {
  IMAGE_STYLE_CONFIG,
  type ImageStyle,
  type ProductCategory,
} from "@/types/photo-studio";

const PRODUCT_PRESERVE = `Keep the product EXACTLY as it appears in the reference image.
Do not alter the product's shape, color, design, pattern, text, logo, or any detail.
The product must be clearly the hero and focal point of the image.
Photorealistic quality. Commercial product photography standard.`;

const CATEGORY_INSTRUCTIONS: Record<ProductCategory, string> = {
  clothing: `The garment must be displayed naturally — either flat lay, on a mannequin,
or styled as worn. Preserve all embroidery, prints, colors, and fabric texture exactly.
Show the full garment unless specified otherwise.`,

  jewellery: `The jewellery must sparkle and catch light naturally.
Show full piece clearly. Preserve all stone colors, metal finish, and intricate details.
Use a surface that complements without competing with the piece.`,

  electronics: `The device/gadget must be shown at a flattering 3/4 angle unless specified.
All buttons, ports, screen content, and branding must be clearly visible.
Screen can show a relevant UI or be lit naturally.`,

  beauty: `The product packaging must be perfectly legible — brand name, product name visible.
Show the product as if freshly unboxed. Cap/lid on unless showing texture.
Lighting should make the packaging look premium and aspirational.`,

  footwear: `Show the footwear from a 3/4 angle that displays both top and sole profile.
Pair shown together or single shoe — must look natural and wearable.
Preserve all color, material texture, sole design, and brand details.`,

  bags: `Show the bag at an angle that displays the front panel, handle/strap, and closure.
Interior not shown unless specified. Hardware details (zips, buckles) must be visible.
Shape must be maintained — stuff the bag mentally so it looks full and structured.`,

  home_decor: `Show the item in context — placed naturally as it would appear in a home.
Scale must feel real. Preserve all colors, patterns, and material textures.
Lighting should feel warm and inviting.`,

  food: `The food/product must look fresh, appetizing, and premium.
Show natural texture. Packaging must be clearly legible if packaged product.
Garnish or props only if they enhance — never overwhelm the product.`,

  general: `Product must be the clear hero of the image.
All identifying features, colors, and text must be preserved exactly.
Professional commercial photography standard.`,
};

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  white_bg: `Pure white background (#FFFFFF), no gradients, no shadows on background.
Professional studio lighting: key light from top-left at 45 degrees, soft fill light from right.
Subtle drop shadow directly below product only — very soft, 20% opacity.
Product centered with equal padding on all sides (20% margin).
Shot with 85mm lens equivalent. No props. No text overlays.
This must meet Amazon's main image requirements: pure white bg, product fills 85% of frame.`,

  lifestyle_wood: `Rich warm wooden surface — oak or walnut grain texture, natural finish.
Surface fills bottom 40% of frame. Background: soft warm beige/cream wall, slightly out of focus.
Natural side lighting from left window — warm golden tone, 3200K color temperature.
Long subtle shadow extending right from product.
1-2 minimal props allowed: small green plant, linen cloth, ceramic mug — nothing that competes.
Shot from slight overhead angle (15 degrees). Warm, cozy, Instagram-worthy aesthetic.`,

  lifestyle_marble: `White Carrara marble surface with subtle grey veining.
Clean white background. Overhead or slight 3/4 angle shot.
Soft diffused studio lighting — bright, airy, editorial feel.
Minimal props: white flowers, gold geometric object — very minimal.
Slight reflection of product in marble surface — very subtle.
Premium, aspirational, luxury feel. High-key lighting.`,

  lifestyle_outdoor: `Natural outdoor setting — lush green garden or park background.
Shallow depth of field — background bokeh at f/1.8 equivalent.
Natural daylight — bright but not harsh. Golden hour feel if clothing.
Product/person shown in natural environment where product would realistically be used.
For clothing: on person or mannequin in outdoor setting.
Fresh, natural, relatable feel. No artificial props.`,

  festive_diwali: `Warm Diwali setting: terracotta diyas with flickering flame effect around product.
Background: dark warm amber/gold gradient suggesting evening celebration.
Scattered marigold petals (genda phool) around base of product.
String lights (diya lamps) softly blurred in background.
Warm golden lighting — 2800K. Product lit separately to remain clear.
Rich, celebratory, Indian festive aesthetic.
Text overlay area: leave top 25% of image clean for seller to add text.`,

  festive_wedding: `Elegant wedding setting: soft pink and gold color palette.
Background: blurred floral arrangement — roses, mogra, or marigold garland.
Surface: white silk or satin fabric with subtle sheen.
Scattered rose petals around product base.
Soft diffused lighting — romantic, warm, ethereal.
For jewellery: shown on white velvet display or draped on silk fabric.
For clothing: displayed flat or on mannequin with floral backdrop.
Premium, aspirational, shaadi season feel.`,

  close_up: `Extreme close-up / macro shot of the most important feature of the product.
For clothing: focus on embroidery, print pattern, or fabric weave texture.
For jewellery: focus on stone, clasp, or engraving detail.
For electronics: focus on button, port, or screen detail.
For beauty: focus on product texture or packaging logo.
Shot with macro lens equivalent. Ultra sharp focus on hero feature.
Soft bokeh background — same color family as product.
This image should make viewer say "oh wow the quality/detail is amazing."`,

  infographic: `Clean product image on pure white or very light gray background.
Product shown in full, centered, professional studio shot.
Leave clear space around the product for text callout lines.
4-6 feature callout areas identified — represented by clean thin lines or arrows
pointing to specific product features.
Minimalist design aesthetic. Product hero, callouts secondary.
Font-ready layout — seller will add their own text callouts in editing.
Style reference: Amazon's A+ content feature comparison images.
DO NOT add any text to the image itself — only the visual layout.`,

  minimal_gray: `Very light gray background — #F5F5F5 to #EEEEEE.
Soft directional studio lighting from top-right, minimal shadows.
Product slightly elevated or on small plinth if applicable.
Clean, modern, Scandinavian aesthetic.
Subtle gradient shadow directly beneath product only.
No props. No distractions. Product is everything.
Secondary/alternate listing image feel — professional and clean.`,
};

export function buildImageEditPrompt(
  style: ImageStyle,
  category: ProductCategory,
  customInstructions?: string
): string {
  const stylePrompt = STYLE_PROMPTS[style];
  const categoryInstruction = CATEGORY_INSTRUCTIONS[category];
  const styleConfig = IMAGE_STYLE_CONFIG[style];
  const extra = customInstructions?.trim();

  return `You are a professional product photographer and image editor specializing in
Indian e-commerce product photography for Amazon India, Flipkart, Meesho, and Instagram.

TASK: Transform the uploaded product image into a professional ${styleConfig.label} style image.

PRODUCT PRESERVATION (CRITICAL — highest priority):
${PRODUCT_PRESERVE}

PRODUCT CATEGORY HANDLING:
${categoryInstruction}

STYLE AND SETTING:
${stylePrompt}

${extra ? `ADDITIONAL SELLER INSTRUCTIONS:\n${extra}\n` : ""}
TECHNICAL REQUIREMENTS:
- Output resolution: 1500x1500px minimum (square format for marketplace compatibility)
- Color space: sRGB
- No watermarks, no text overlays (unless infographic style)
- No borders or frames
- The product must be immediately recognizable as the same product from the input image

QUALITY STANDARD:
This image will be used in a real product listing on Amazon India or Instagram.
It must look indistinguishable from a professional studio photograph.
If any part of the output looks AI-generated or unnatural, redo that element.

Generate the transformed image now.`;
}
