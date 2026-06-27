type ClerkExternalAccount = {
  id: string;
  provider: string;
  emailAddress?: string | null;
  username?: string | null;
  label?: string | null;
  imageUrl?: string | null;
};

type ClerkUserProfile = {
  fullName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  publicMetadata?: Record<string, unknown> | null;
  externalAccounts: ReadonlyArray<ClerkExternalAccount>;
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  oauth_google: "Google",
  facebook: "Facebook",
  oauth_facebook: "Facebook",
  apple: "Apple",
  oauth_apple: "Apple",
  github: "GitHub",
  oauth_github: "GitHub",
  microsoft: "Microsoft",
  oauth_microsoft: "Microsoft",
  linkedin: "LinkedIn",
  oauth_linkedin: "LinkedIn",
  twitter: "X",
  oauth_twitter: "X",
  tiktok: "TikTok",
  oauth_tiktok: "TikTok",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  user: "Owner",
  subaccount: "Subaccount",
};

export type ConnectedAuthAccount = {
  id: string;
  provider: string;
  label: string;
  detail: string | null;
  imageUrl: string | null;
};

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export function formatClerkRole(role: string | undefined): string {
  if (!role) return "Owner";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export function formatOAuthProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (PROVIDER_LABELS[normalized]) return PROVIDER_LABELS[normalized]!;

  const stripped = normalized.replace(/^oauth_/, "");
  if (PROVIDER_LABELS[stripped]) return PROVIDER_LABELS[stripped]!;

  return stripped
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getConnectedAuthAccounts(
  user: ClerkUserProfile
): ConnectedAuthAccount[] {
  return user.externalAccounts.map((account) => ({
    id: account.id,
    provider: account.provider,
    label: formatOAuthProvider(account.provider),
    detail:
      account.emailAddress?.trim() ||
      account.username?.trim() ||
      account.label?.trim() ||
      null,
    imageUrl: account.imageUrl ?? null,
  }));
}

export function getUserDisplayName(user: ClerkUserProfile): string {
  return (
    user.fullName?.trim() ||
    user.primaryEmailAddress?.emailAddress?.trim() ||
    "Account"
  );
}

export function usesEmailSignIn(user: ClerkUserProfile): boolean {
  return Boolean(user.primaryEmailAddress?.emailAddress);
}
