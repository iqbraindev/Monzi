export type WorkspaceMemberRole = "owner" | "admin" | "member";

export interface WorkspaceRow {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  description: string | null;
  activity_domain: string | null;
  logo_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceProfileInput {
  name?: string;
  description?: string | null;
  activity_domain?: string | null;
}

export interface WorkspaceWithRole extends WorkspaceRow {
  member_role: WorkspaceMemberRole;
}

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  ownerUserId: string;
  memberRole: WorkspaceMemberRole;
  isDefaultWorkspace: boolean;
}

export interface LimitExceededError {
  error: string;
  upgradeRequired: true;
  limit: string;
  current: number;
  max: number;
}

export function limitExceeded(
  limit: string,
  current: number,
  max: number,
  message: string
): LimitExceededError {
  return {
    error: message,
    upgradeRequired: true,
    limit,
    current,
    max,
  };
}
