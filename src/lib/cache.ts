import { getRedis } from "@/lib/redis";

class RedisCache {
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async del(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const redis = getRedis();
    return (await redis.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    const redis = getRedis();
    return await redis.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const redis = getRedis();
    await redis.expire(key, ttlSeconds);
  }

  async getAndDel<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (raw === null) return null;
    await redis.del(key);
    return JSON.parse(raw) as T;
  }
}

export const cache = new RedisCache();
