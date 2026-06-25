import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not configured");
    }
    redisClient = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return redisClient;
}
