import { db } from "@/lib/db";

export type DashboardStats = {
  totalProcessed: number;
  inQueue: number;
  activeBatches: number;
  last7Days: { label: string; count: number; key: string }[];
};

function dayKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Aggregates Photo Studio (ImageJob) stats for the seller dashboard.
 */
export async function getDashboardStats(sellerId: string): Promise<DashboardStats> {
  const [totalProcessed, inQueue, activeBatches] = await Promise.all([
    db.imageJob.count({ where: { sellerId, status: "done" } }),
    db.imageJob.count({
      where: { sellerId, status: { in: ["pending", "processing"] } },
    }),
    db.imageBatch.count({ where: { sellerId, status: "running" } }),
  ]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const jobs = await db.imageJob.findMany({
    where: {
      sellerId,
      status: "done",
      completedAt: { gte: start },
    },
    select: { completedAt: true },
  });

  const counts = new Map<string, number>();
  const labels: { label: string; key: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const key = dayKeyLocal(day);
    counts.set(key, 0);
    labels.push({
      key,
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
    });
  }

  for (const j of jobs) {
    if (!j.completedAt) continue;
    const key = dayKeyLocal(new Date(j.completedAt));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const last7Days = labels.map(({ key, label }) => ({
    key,
    label,
    count: counts.get(key) ?? 0,
  }));

  return {
    totalProcessed,
    inQueue,
    activeBatches,
    last7Days,
  };
}
