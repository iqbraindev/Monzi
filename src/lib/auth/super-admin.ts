import { clerkClient } from "@clerk/nextjs/server";

type SessionClaims = Record<string, unknown> | null | undefined;

export function resolveSuperAdminRole(email: string): "super_admin" | "user" {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!superAdminEmail) return "user";
  return email.trim().toLowerCase() === superAdminEmail ? "super_admin" : "user";
}

/** Reads email addresses embedded in the Clerk session JWT (when configured). */
export function getSessionEmails(sessionClaims: SessionClaims): string[] {
  if (!sessionClaims) return [];

  const emails: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.includes("@")) emails.push(value);
  };

  push(sessionClaims.email);
  push(sessionClaims.primary_email_address);
  push(sessionClaims.primaryEmailAddress);

  const publicMetadata = sessionClaims.publicMetadata as
    | { email?: string }
    | undefined;
  push(publicMetadata?.email);

  return emails;
}

export function sessionMatchesSuperAdminEmail(
  sessionClaims: SessionClaims
): boolean {
  const target = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!target) return false;
  return getSessionEmails(sessionClaims).some(
    (email) => email.trim().toLowerCase() === target
  );
}

/** Authoritative role from Clerk (email env match wins over stale metadata). */
export async function getClerkUserRole(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (email && resolveSuperAdminRole(email) === "super_admin") {
    return "super_admin";
  }
  return (user.publicMetadata?.role as string | undefined) ?? "user";
}

export function resolveEffectiveRole(
  sessionClaims: SessionClaims,
  jwtRole: string | undefined
): string {
  if (jwtRole === "super_admin") return "super_admin";
  if (sessionMatchesSuperAdminEmail(sessionClaims)) return "super_admin";
  return jwtRole ?? "user";
}
