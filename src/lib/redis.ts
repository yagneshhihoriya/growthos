import IORedis from "ioredis";

let shared: IORedis | null = null;

export function getRedis(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set (required for BullMQ image processing)");
  }
  if (!shared) {
    shared = new IORedis(url, {
      maxRetriesPerRequest: null,
    });
  }
  return shared;
}

export function getRedisConnectionOptions():
  | { host: string; port: number; password?: string; username?: string; tls?: Record<string, unknown> }
  | IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return getRedis();
}
