import { auth } from "@clerk/nextjs/server";

import { resolveUserRole } from "@/lib/auth/resolve-role";

type AuthResult =
  | { userId: string; role: string; error?: never }
  | { userId?: never; role?: never; error: Response };

export async function requireAuth(): Promise<AuthResult> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await resolveUserRole(userId, sessionClaims);
  return { userId, role };
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;
  if (result.role !== "super_admin") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
