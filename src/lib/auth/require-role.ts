import { auth } from "@clerk/nextjs/server";

type AuthResult =
  | { userId: string; role: string; error?: never }
  | { userId?: never; role?: never; error: Response };

export async function requireAuth(): Promise<AuthResult> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role =
    (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role ??
    "user";
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
