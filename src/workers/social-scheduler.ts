/**
 * Calls the same HTTP cron routes as Vercel Cron (Bearer CRON_SECRET).
 * Run alongside the app: `npm run worker:social`
 */
import { Queue, Worker } from "bullmq";
import { getRedis } from "@/lib/redis";

const QUEUE_NAME = "social-cron-tick";

async function hit(path: string): Promise<void> {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[social-scheduler] CRON_SECRET is not set — skipping tick");
    return;
  }
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[social-scheduler] ${path} → ${res.status}`, text.slice(0, 500));
    return;
  }
  console.info(`[social-scheduler] ${path} → ${res.status}`, text.slice(0, 200));
}

async function main(): Promise<void> {
  const connection = getRedis();

  const queue = new Queue(QUEUE_NAME, { connection });

  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // BullMQ cron uses 6 fields (sec min hour day month dow). Mirrors vercel.json schedules.
  await queue.add("publish-posts", {}, { repeat: { pattern: "0 */5 * * * *" } });
  await queue.add("fetch-insights", {}, { repeat: { pattern: "0 30 21 * * *" } });
  await queue.add("refresh-meta-tokens", {}, { repeat: { pattern: "0 0 2 * * *" } });

  // eslint-disable-next-line no-console
  console.info("[social-scheduler] Repeatable jobs registered. Processing…");

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "publish-posts") await hit("/api/cron/publish-posts");
      else if (job.name === "fetch-insights") await hit("/api/cron/fetch-insights");
      else if (job.name === "refresh-meta-tokens") await hit("/api/cron/refresh-meta-tokens");
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error("[social-scheduler] job failed", job?.id, err);
  });

  process.on("SIGINT", async () => {
    await worker.close();
    await queue.close();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
