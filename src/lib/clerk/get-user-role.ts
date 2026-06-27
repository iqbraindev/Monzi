import { clerkClient } from "@clerk/nextjs/server";

export async function getUserRole(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata.role as string) || "user";
}
