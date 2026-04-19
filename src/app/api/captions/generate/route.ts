import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CaptionFormSchema } from "@/lib/schemas/caption";
import { buildCaptionUserMessage, captionJsonSystemInstruction } from "@/lib/caption-prompt";
import { streamCaptionJsonCustom } from "@/lib/caption-gen";
import { tryParseCaptionsJson } from "@/lib/caption-parse";
import { isCaptionGenerationRateLimited } from "@/lib/caption-generation-rate-limit";
import type { CaptionVariant } from "@/types/caption";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const sellerId = session.user.id;

  if (await isCaptionGenerationRateLimited(sellerId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Caption limit reached. Try again in an hour.",
        },
      },
      { status: 429 }
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAVAILABLE", message: "Caption generation is not configured." },
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CaptionFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const system = captionJsonSystemInstruction();
  const user = buildCaptionUserMessage(parsed.data);

  try {
    let acc = "";
    for await (const delta of streamCaptionJsonCustom(system, user)) {
      acc += delta;
    }
    const variants = tryParseCaptionsJson(acc);
    if (!variants?.length) {
      return NextResponse.json(
        { success: false, error: { code: "PARSE_ERROR", message: "Could not read model output." } },
        { status: 502 }
      );
    }

    const normalized: CaptionVariant[] = variants.map((v, i) => ({
      id: typeof v.id === "number" ? v.id : i + 1,
      tone: typeof v.tone === "string" ? v.tone : "variant",
      caption: v.caption,
      hashtags: Array.isArray(v.hashtags) ? v.hashtags.filter((h) => typeof h === "string") : [],
    }));

    return NextResponse.json({ success: true, data: { variants: normalized } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    console.error("[POST /api/captions/generate]", e);
    return NextResponse.json(
      { success: false, error: { code: "GENERATION_FAILED", message: msg } },
      { status: 500 }
    );
  }
}
