import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BodySchema = z.object({
  sales: z.coerce.number().int().min(1).max(99999),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const { sales } = BodySchema.parse(json);

    const test = await db.abTest.findFirst({
      where: { id: params.id, sellerId: session.user.id },
    });
    if (!test) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (test.status === "complete") {
      return NextResponse.json({ error: "This test is already complete" }, { status: 400 });
    }

    if (test.status === "running_a") {
      const updated = await db.abTest.update({
        where: { id: params.id },
        data: {
          salesA: sales,
          currentVariant: "B",
          status: "running_b",
          phaseAEndedAt: new Date(),
        },
      });

      const perDay = test.daysA > 0 ? (sales / test.daysA).toFixed(1) : "0";
      return NextResponse.json({
        test: updated,
        phase: "switched_to_b",
        message: `Phase A recorded: ${sales} orders in ${test.daysA} days (${perDay}/day). Now update your ${test.platform} listing to Title B and run it for ${test.daysB} days.`,
        nextAction: `Switch your marketplace listing to Title B now, then come back after ${test.daysB} days to record Phase B sales.`,
        titleB: test.titleB,
      });
    }

    if (test.status === "running_b") {
      const salesPerDayA = test.daysA > 0 ? test.salesA / test.daysA : 0;
      const salesPerDayB = test.daysB > 0 ? sales / test.daysB : 0;

      const winner = salesPerDayB >= salesPerDayA * 0.95 ? "B" : "A";
      const winnerTitle = winner === "A" ? test.titleA : test.titleB;

      const improvementPct =
        salesPerDayA > 0 ? Math.abs(((salesPerDayB - salesPerDayA) / salesPerDayA) * 100).toFixed(1) : "0";

      const isBetter = salesPerDayB > salesPerDayA * 1.05;

      const updated = await db.abTest.update({
        where: { id: params.id },
        data: {
          salesB: sales,
          status: "complete",
          winner,
          winnerTitle,
          endedAt: new Date(),
        },
        include: {
          product: { select: { name: true } },
        },
      });

      let message: string;
      if (winner === "B" && isBetter) {
        message = `Title B wins! ${improvementPct}% more daily sales (${salesPerDayB.toFixed(1)} vs ${salesPerDayA.toFixed(1)}/day). Keep Title B on your listing.`;
      } else if (winner === "A") {
        message = `Title A wins! Title B underperformed by ${improvementPct}%. Switch back to Title A.`;
      } else {
        message = "Results are very close (within 5%). Keep Title B as it's the newer optimized version.";
      }

      return NextResponse.json({
        test: updated,
        phase: "complete",
        winner,
        winnerTitle,
        salesPerDayA: salesPerDayA.toFixed(1),
        salesPerDayB: salesPerDayB.toFixed(1),
        improvement: improvementPct,
        isBetter,
        message,
      });
    }

    return NextResponse.json({ error: "Unexpected test state" }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid body" }, { status: 400 });
    }
    console.error("[api/titles/ab-tests/enter-sales]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
