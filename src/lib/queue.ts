import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

let imageQueue: Queue | null = null;

export function getImageQueue(): Queue {
  if (!imageQueue) {
    imageQueue = new Queue("image-processing", {
      connection: getRedis(),
    });
  }
  return imageQueue;
}
