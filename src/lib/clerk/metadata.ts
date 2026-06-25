import { clerkClient } from "@clerk/nextjs/server";
import { getRedis } from "@/lib/redis/client";

export async function updateUserPlan(
  userId: string,
  plan: string,
  status: string
) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { plan, plan_status: status },
  });
  await getRedis().del(`limits:${userId}`);
}

export async function getUserRole(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata.role as string) || "user";
}
