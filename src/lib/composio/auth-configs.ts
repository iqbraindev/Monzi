import { getComposio } from "@/lib/composio/client";
import { getRedisOptional } from "@/lib/redis/optional";

const AUTH_CONFIG_TTL_SEC = 7 * 24 * 60 * 60;

export async function getOrCreateAuthConfigId(toolkit: string): Promise<string> {
  const redis = getRedisOptional();
  const cacheKey = `composio:auth_config:${toolkit}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  }

  const composio = await getComposio();

  const existing = await composio.authConfigs.list({
    toolkit,
  });

  const managed = existing.items.find(
    (item) => item.isComposioManaged && item.status === "ENABLED"
  );
  if (managed?.id) {
    if (redis) await redis.setex(cacheKey, AUTH_CONFIG_TTL_SEC, managed.id);
    return managed.id;
  }

  const created = await composio.authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
  });

  if (redis) await redis.setex(cacheKey, AUTH_CONFIG_TTL_SEC, created.id);
  return created.id;
}
