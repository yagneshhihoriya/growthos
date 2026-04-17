import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (pusherInstance) return pusherInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_APP_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) return null;

  pusherInstance = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return pusherInstance;
}

export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_APP_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

export async function triggerBatchProgress(params: {
  sellerId: string;
  batchId: string;
  jobId: string;
  processedCount: number;
  totalImages: number;
  failedCount: number;
  status: string;
  completedJobUrl?: Record<string, string>;
}): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;

  const channel = `private-seller-${params.sellerId}`;
  await pusher.trigger(channel, "batch-progress", {
    batchId: params.batchId,
    jobId: params.jobId,
    processedCount: params.processedCount,
    totalImages: params.totalImages,
    failedCount: params.failedCount,
    status: params.status,
    completedJobUrl: params.completedJobUrl,
    progress: params.totalImages > 0
      ? Math.round(((params.processedCount + params.failedCount) / params.totalImages) * 100)
      : 0,
  });
}

export { getPusher };
