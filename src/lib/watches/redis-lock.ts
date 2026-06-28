import { getRedisOptional } from "@/lib/redis/optional";

const LOCK_KEY = "watch:poll:lock";
const LOCK_TTL_SEC = 120;

export async function acquireWatchPollLock(): Promise<{
  acquired: boolean;
  release: () => Promise<void>;
}> {
  const redis = getRedisOptional();
  if (!redis) {
    return {
      acquired: true,
      release: async () => {},
    };
  }

  const token = `${process.pid}-${Date.now()}`;
  const result = await redis.set(LOCK_KEY, token, "EX", LOCK_TTL_SEC, "NX");
  const acquired = result === "OK";

  return {
    acquired,
    release: async () => {
      const current = await redis.get(LOCK_KEY);
      if (current === token) {
        await redis.del(LOCK_KEY);
      }
    },
  };
}
