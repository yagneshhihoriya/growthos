import { cache } from "@/lib/cache";

const MAX_PER_HOUR = 20;
const WINDOW_SEC = 3600;

/** Fixed window per UTC hour bucket. Returns false if allowed, true if limited. */
export async function isCaptionGenerationRateLimited(sellerId: string): Promise<boolean> {
  try {
    const bucket = Math.floor(Date.now() / (WINDOW_SEC * 1000));
    const key = `caption:gen:${sellerId}:${bucket}`;
    const n = await cache.incr(key);
    if (n === 1) await cache.expire(key, WINDOW_SEC);
    return n > MAX_PER_HOUR;
  } catch {
    return false;
  }
}
