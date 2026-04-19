import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CreateSchema = z.object({
  productId: z.string().optional(),
  optimizationId: z.string().optional(),
  titleA: z.string().min(1).max(500),
  titleB: z.string().min(1).max(500),
  platform: z.enum(["amazon", "flipkart", "meesho"]).default("meesho"),
  daysA: z.number().int().min(7).max(30).default(14),
  daysB: z.number().int().min(7).max(30).default(14),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const input = CreateSchema.parse(json);

    if (input.productId) {
      const existing = await db.abTest.findFirst({
        where: {
          productId: input.productId,
          sellerId: session.user.id,
          status: { in: ["running_a", "running_b"] },
        },
      });
      if (existing) {
        return NextResponse.json(
          {
            error:
              "An active A/B test already exists for this product. Complete or delete it before starting a new one.",
            existingTestId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    const test = await db.abTest.create({
      data: {
        sellerId: session.user.id,
        productId: input.productId ?? null,
        optimizationId: input.optimizationId ?? null,
        titleA: input.titleA,
        titleB: input.titleB,
        platform: input.platform,
        daysA: input.daysA,
        daysB: input.daysB,
        currentVariant: "A",
        status: "running_a",
      },
      include: {
        product: { select: { name: true, rawImageUrls: true } },
      },
    });

    return NextResponse.json({ test });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid body" }, { status: 400 });
    }
    console.error("[api/titles/ab-tests POST]", e);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  const tests = await db.abTest.findMany({
    where: {
      sellerId: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: {
      product: { select: { name: true, rawImageUrls: true } },
    },
  });

  return NextResponse.json({ tests });
}
