import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await db.bulkTitleJob.findFirst({
    where: { id: params.jobId, sellerId: session.user.id },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const progress =
    job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    failedRows: job.failedRows,
    progress,
    outputFileUrl: job.outputFileUrl,
    errorSummary: job.errorSummary,
    completedAt: job.completedAt,
  });
}
