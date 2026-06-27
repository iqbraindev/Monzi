import { getUserRole } from "@/lib/clerk/get-user-role";

import { getRoleFromSessionClaims } from "@/lib/auth/session-claims";

type SessionClaims = Record<string, unknown> | null | undefined;

export { getRoleFromSessionClaims } from "@/lib/auth/session-claims";

/** Session claim first, then Clerk publicMetadata (source of truth). */
export async function resolveUserRole(
  userId: string,
  sessionClaims: SessionClaims
): Promise<string> {
  const fromSession = getRoleFromSessionClaims(sessionClaims);
  if (fromSession) return fromSession;
  return getUserRole(userId);
}
