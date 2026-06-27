import { clerkClient } from "@clerk/nextjs/server";
import { getRedis } from "@/lib/redis/client";

export { getUserRole } from "@/lib/clerk/get-user-role";

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
