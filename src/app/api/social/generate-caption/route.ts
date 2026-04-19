import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { streamCaptionJson, type CaptionGenInput } from "@/lib/caption-gen";

/** Gemini streaming (not Claude) — see `GEMINI_API_KEY` / `GEMINI_CAPTION_MODEL`. */
export const dynamic = "force-dynamic";

const InputSchema = z.object({
  productName: z.string().min(1),
  category: z.string(),
  superCategory: z.string().optional(),
  price: z.number().positive(),
  colors: z.array(z.string()).optional().default([]),
  sizes: z.array(z.string()).optional().default([]),
  fabric: z.string().optional(),
  occasion: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.string()).optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  ingredients: z.string().optional(),
  highlight: z.string().optional(),
  audience: z.array(z.string()).optional(),
  offer: z.string().optional(),
  cta: z.string().optional(),
  platformTarget: z.enum(["instagram", "facebook", "both"]).optional(),
  language: z.enum(["hindi", "hinglish", "english"]).default("hinglish"),
  tone: z.enum(["casual", "urgent", "festive", "premium"]).default("casual"),
  includeHashtags: z.boolean().default(true),
  sellerCity: z.string().default("Surat"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured for caption generation" },
      { status: 503 }
    );
  }

  let input: CaptionGenInput;
  try {
    const body = await req.json();
    input = InputSchema.parse(body) as CaptionGenInput;
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.flatten().fieldErrors : "Invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of streamCaptionJson(input)) {
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Caption generation failed";
        console.error("[generate-caption]", e);
        controller.enqueue(encoder.encode(`\n{"error":${JSON.stringify(msg)}}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
