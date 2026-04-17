import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Legacy batch image pipeline (remove-bg, presets, marketplace sizes) has been removed.
 * Use POST /api/images/generate from Photo Studio instead.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    {
      error:
        "Batch processing is no longer available. Open Photo Studio and use Generate (edit image or create from prompt) via POST /api/images/generate.",
    },
    { status: 501 }
  );
}
