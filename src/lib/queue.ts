import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

let imageQueue: Queue | null = null;
let bulkTitleQueue: Queue | null = null;

export function getImageQueue(): Queue {
  if (!imageQueue) {
    imageQueue = new Queue("image-processing", {
      connection: getRedis(),
    });
  }
  return imageQueue;
}

/** BullMQ queue for Phase B bulk title CSV jobs (`npm run worker:bulk-titles`). */
export function getBulkTitleQueue(): Queue {
  if (!bulkTitleQueue) {
    bulkTitleQueue = new Queue("bulk-title", {
      connection: getRedis(),
    });
  }
  return bulkTitleQueue;
}
