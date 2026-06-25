import type Redis from "ioredis";

import { getRedis } from "@/lib/redis/client";

let warned = false;

/** Returns Redis client or null if not configured — for optional caching. */
export function getRedisOptional(): Redis | null {
  if (!process.env.REDIS_URL) {
    if (!warned && process.env.NODE_ENV === "development") {
      warned = true;
      console.warn("[redis] REDIS_URL not set — skipping cache");
    }
    return null;
  }
  try {
    return getRedis();
  } catch {
    return null;
  }
}
