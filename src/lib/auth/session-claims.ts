type SessionClaims = Record<string, unknown> | null | undefined;

/** Reads role from the JWT when the session token includes it. */
export function getRoleFromSessionClaims(
  sessionClaims: SessionClaims
): string | undefined {
  if (!sessionClaims) return undefined;

  const publicMetadata = sessionClaims.publicMetadata as
    | { role?: string }
    | undefined;
  if (publicMetadata?.role) return publicMetadata.role;

  if (typeof sessionClaims.role === "string") return sessionClaims.role;

  const metadata = sessionClaims.metadata as { role?: string } | undefined;
  if (metadata?.role) return metadata.role;

  return undefined;
}
