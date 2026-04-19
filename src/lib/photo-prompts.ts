import {
  IMAGE_STYLE_CONFIG,
  type ImageStyle,
  type ProductAnalysis,
  type ProductCategory,
} from "@/types/photo-studio";

const PRODUCT_PRESERVE = `Keep the product EXACTLY as it appears in the reference image.
Do not alter the product's shape, color, design, pattern, text, logo, or any detail.
The product must be clearly the hero and focal point of the image.
Photorealistic quality. Commercial product photography standard.`;

/**
 * Prepended verbatim to every non-festive style prompt. Festive styles
 * (festive_diwali, festive_wedding) are excluded because they legitimately
 * need diyas, marigolds, candles, and floral decor.
 *
 * This lives at the TOP of the style block so the model reads the strict
 * rule BEFORE it reads the scene description — negative rules should win
 * over any scene wording that might accidentally imply festive elements.
 */
const NO_FESTIVE_INSTRUCTION = `STRICT RULE: This is NOT a festive or seasonal image.
Absolutely NO diyas, NO marigolds, NO candles, NO flower petals, NO rangoli,
NO festive decorations, NO string lights, NO seasonal props of any kind.
Clean professional commercial product photography ONLY.`;

const FESTIVE_STYLES: ReadonlySet<ImageStyle> = new Set<ImageStyle>([
  "festive_diwali",
  "festive_wedding",
]);

const CATEGORY_INSTRUCTIONS: Record<ProductCategory, string> = {
  clothing_kurti: `Indian ethnic wear — kurti, salwar, suit.
Display on mannequin or model. Show full garment.
Preserve all embroidery, print patterns, colors, fabric texture exactly.
Neckline and sleeve details must be clearly visible.`,

  clothing_saree: `Indian saree, lehenga, or dupatta.
Show draped naturally or flat lay depending on style.
Preserve all zari work, embroidery, border details, and color.
For lehenga — show skirt + blouse + dupatta together.`,

  clothing_western: `Western wear — t-shirt, dress, jeans, top.
Display flat lay or on mannequin. Clean, modern presentation.
Preserve all prints, graphics, colors, and fabric texture.`,

  clothing_kids: `Children's clothing — cute, playful presentation.
Show garment clearly — flat lay or on small mannequin.
Preserve all prints, characters, colors exactly.`,

  jewellery_gold: `Fine gold jewellery — necklace, bangles, earrings, ring.
Place on dark velvet or white silk surface for maximum contrast.
Jewellery must sparkle — studio lighting to catch gold shine.
All filigree work, stone settings, and hallmark details must be sharp.`,

  jewellery_fashion: `Fashion/artificial jewellery — imitation, beaded, oxidised.
Show on neutral surface — white or cream.
All stones, beads, metal finish must be clearly visible.
Make it look premium despite being artificial.`,

  bags_handbag: `Handbag, clutch, or purse.
Show at 3/4 angle displaying front panel, handles, and closure.
Hardware (zips, buckles, chains) must be visible and shiny.
Bag must appear full and structured — not flat or saggy.`,

  bags_backpack: `Backpack or travel bag.
Show full product — front and side panels visible.
All pockets, zips, straps, and branding clearly shown.
Upright position, appears full.`,

  footwear_heels: `Women's heels, wedges, or sandals.
Show pair together — one slightly in front for depth.
Heel height and design clearly visible from side angle.
All straps, buckles, and sole detail preserved.`,

  footwear_casual: `Casual footwear — sneakers, flats, chappal.
Show pair from 3/4 front angle. Both shoes visible.
Sole design and upper material texture clearly shown.`,

  electronics_watch: `Smartwatch or analog watch.
Show at flattering 3/4 angle — face, crown, and band all visible.
Screen content must be clearly legible if smartwatch.
Band texture, case finish, and button details sharp and clear.
NO festive props. Clean professional electronics photography.`,

  electronics_phone: `Mobile phone or tablet.
Show front face (screen on) and slight side profile.
Screen can show a relevant app or home screen.
Camera module, buttons, and port details visible.
Clean, tech product photography aesthetic.`,

  electronics_audio: `Earbuds, headphones, or speaker.
Show product from angle that displays key design features.
For earbuds — show with case open and buds visible.
All ports, buttons, and finish details clear.`,

  electronics_gadget: `Electronic gadget or device.
Show from angle that shows the most important features.
All buttons, displays, ports, and branding visible.
Professional tech product photography.
NO festive decorations under any circumstances.`,

  beauty_skincare: `Skincare product — cream, serum, moisturiser.
Packaging must be fully legible — brand name, product name, key claims.
Show as freshly unboxed. Cap on unless showing texture.
Lighting: bright and airy — makes product look pure and premium.`,

  beauty_makeup: `Makeup product — lipstick, kajal, foundation, eyeshadow.
Show packaging clearly. For lipstick — bullet can be partially shown.
Color/shade must be accurately represented.
Premium, aspirational beauty editorial aesthetic.`,

  beauty_haircare: `Haircare product — hair oil, shampoo, conditioner, mask.
Full packaging visible. All text legible.
Natural ingredients (if applicable) can be shown alongside.
Clean, fresh, healthy aesthetic.`,

  home_decor: `Home decor item — diya, photo frame, cushion, showpiece.
Show in context — placed as it would appear in a home.
Scale must feel real. Colors and materials preserved exactly.
Warm, inviting, lifestyle feel.`,

  food_packaged: `Packaged food — dry fruits, snacks, spices, pickle.
Packaging must be clearly readable — brand, product, weight.
Show product looking fresh and appetizing.
If showing contents — nuts, spices must look premium and fresh.`,

  general: `Product must be the clear hero.
All identifying features, colors, and text preserved exactly.
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

  close_up: `SIDE / ANGLE detail close-up — NOT front facing.
This shot must reveal build quality and craftsmanship from an angle,
and must look clearly different from any front-on close-up.

FOR WATCHES: Show the watch from the side — crown, pusher buttons,
case edge, band attachment lugs. Any side-mounted action button must
be prominently visible. Band texture shown at macro level.
Shot from a 3–4 o'clock position looking at the case side.
Dark gradient background. Dramatic directional side lighting.

FOR PHONES / TABLETS: Side profile — buttons, ports, camera bump,
frame material. Show device thickness and premium finishing.

FOR BEAUTY: Side of packaging — cap, nozzle, or applicator detail.
Texture of product (cream / gel / serum) shown through clear packaging
if visible.

FOR CLOTHING: Extreme close-up of fabric weave, embroidery thread,
zari, or a decorative element. Show craftsmanship at macro level.

FOR JEWELLERY: Side view of stone setting, clasp mechanism, or chain
link detail. Show depth and construction.

Technical: true macro / f/2.8, dramatic directional side light,
deep bokeh background, ultra sharp on a single feature. No empty
white negative space — background should feel cinematic.`,

  close_up_front: `FRONT-FACING close-up of the product's most important face / surface.
Straight-on, no angle. Product face fills ~80% of the frame.

FOR WATCHES: Watch face front-on, dial filling most of the frame.
Every detail of the dial razor-sharp — hour markers, hands,
complications, subdials, brand logo, text. If smartwatch, screen
content is fully legible. Dark vignette background; product
illuminated from the front. Shot as if looking directly at the face.

FOR PHONES / TABLETS: Screen fills the frame, bezel and front
camera visible. Screen shows relevant content (home screen, app,
or wallpaper). Rear camera module is NOT the focus.

FOR BEAUTY PRODUCTS: Label / packaging faces the camera directly.
Every word on the label must be legible. Bright, clean, airy
lighting. Brand and product name hero.

FOR CLOTHING: Focus on the most detailed front-facing part of the
garment — neckline, collar, placket, or central embroidery. Fabric
texture visible at this scale.

FOR JEWELLERY: Front-on of the main pendant / central stone /
centerpiece. Maximum sparkle; every facet and detail visible.

Technical: macro / telephoto-equivalent, ~f/4, front-lit with
fill from either side, slight vignette around the edges, ultra
sharp focus on the centre, soft bokeh on the edges if applicable.`,

  infographic: `Amazon-style feature-highlight image.

HARD RULES — read before anything else:
- DO NOT draw empty boxes or rectangles.
- DO NOT leave blank placeholder areas waiting for text.
- DO NOT write any text, letters, numbers, or labels in the image.
Seller will add their own text labels after downloading.

Instead, create a polished product shot where key features are
VISUALLY highlighted through composition + thin annotation lines
ending in small dots (the seller types their labels at the dot ends).

FOR WATCHES (and most electronics):
- Product at a clean 3/4 angle, brilliantly lit.
- Background: smooth gradient from #1a1a2e (dark blue-black) to
  #16213e. This is a DARK THEME infographic — product glows against
  the dark background.
- Add 3–4 thin white annotation lines (1–2 px) extending from key
  features. Example anchor points:
    1. The crown / button → line extends right, small dot at the end.
    2. The screen / dial → line extends left, small dot at the end.
    3. The band / strap  → line extends down-right, small dot at the end.
    4. An action button / port → line extends right, small dot at the end.
- Each line has a small filled circle (≈4 px) at both ends.
- Lines are perfectly straight — horizontal or at ~30° angles.

FOR CLOTHING:
- Garment flat lay on a clean white background (LIGHT THEME).
- Annotation lines (1 px, dark gray) pointing to: fabric area,
  embroidery detail, sleeve design, neckline style.

FOR BEAUTY:
- White / cream background (LIGHT THEME). Product at a slight angle.
- Annotation lines pointing to: key-ingredients area on the label,
  applicator / nozzle, and the product-size area.

FOR JEWELLERY:
- Dark velvet or soft gradient background (DARK THEME).
- Lines pointing to: central stone, clasp, setting detail.

ANNOTATION LINE STYLE (applies to all themes):
- 1 px white on dark backgrounds, 1 px dark gray on light backgrounds.
- Small filled circle (~4 px) at the product end AND at the outer end.
- Perfectly straight — horizontal or ~30° angles only.
- 3–5 lines maximum — restraint > density.

Reference aesthetic: Apple product-page annotation style. The image
should make it obvious WHERE the labels belong (at the outer dots)
without containing any actual text.`,
};

/**
 * Renders the Gemini Vision analysis into a compact block of "product
 * intelligence" that can be dropped into a generation prompt. Returns an
 * empty string when no analysis is available so the caller can splice it
 * unconditionally.
 */
function buildAnalysisBlock(
  analysis: ProductAnalysis | null | undefined,
  style: ImageStyle
): string {
  if (!analysis) return "";

  const styleRec = analysis.styleRecommendations?.[style];
  const doNotInclude = analysis.doNotInclude?.length
    ? analysis.doNotInclude.join(", ")
    : "";

  const lines = [
    `- Exact product: ${analysis.productType}`,
    `- Price segment: ${analysis.priceSegment} — adjust quality/aspirational level accordingly`,
    analysis.primaryColor ? `- Primary colour: ${analysis.primaryColor}` : "",
    analysis.keyFeatures.length
      ? `- Key features to preserve: ${analysis.keyFeatures.join(", ")}`
      : "",
    `- Target buyer: ${analysis.targetGender}`,
    analysis.photographyNotes.idealAngle
      ? `- Best angle for this product: ${analysis.photographyNotes.idealAngle}`
      : "",
    analysis.photographyNotes.lightingStyle
      ? `- Lighting that works: ${analysis.photographyNotes.lightingStyle}`
      : "",
    analysis.photographyNotes.amazonTopSellersUse
      ? `- How top Amazon sellers shoot this: ${analysis.photographyNotes.amazonTopSellersUse}`
      : "",
    analysis.photographyNotes.commonMistakes
      ? `- Common mistakes to avoid: ${analysis.photographyNotes.commonMistakes}`
      : "",
    styleRec ? `- Specific instruction for this style: ${styleRec}` : "",
    doNotInclude ? `- NEVER include these in the image: ${doNotInclude}` : "",
  ].filter(Boolean);

  return `PRODUCT INTELLIGENCE (from AI analysis of the uploaded image):
${lines.join("\n")}

Apply all points above to make this image as accurate as possible to the real product.`;
}

export function buildImageEditPrompt(
  style: ImageStyle,
  category: ProductCategory,
  customInstructions?: string,
  analysis?: ProductAnalysis | null
): string {
  const baseStylePrompt = STYLE_PROMPTS[style];
  const stylePrompt = FESTIVE_STYLES.has(style)
    ? baseStylePrompt
    : `${NO_FESTIVE_INSTRUCTION}\n\n${baseStylePrompt}`;
  const categoryInstruction = CATEGORY_INSTRUCTIONS[category];
  const styleConfig = IMAGE_STYLE_CONFIG[style];
  const extra = customInstructions?.trim();
  const analysisBlock = buildAnalysisBlock(analysis, style);

  return `You are a professional product photographer and image editor specializing in
Indian e-commerce product photography for Amazon India, Flipkart, Meesho, and Instagram.

TASK: Transform the uploaded product image into a professional ${styleConfig.label} style image.

PRODUCT PRESERVATION (CRITICAL — highest priority):
${PRODUCT_PRESERVE}

PRODUCT CATEGORY HANDLING:
${categoryInstruction}
${analysisBlock ? `\n${analysisBlock}\n` : ""}
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
