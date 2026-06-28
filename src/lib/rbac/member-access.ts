import type { WorkspaceContext } from "@/lib/workspaces/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export class MemberAccessDeniedError extends Error {
  readonly status = 403;

  constructor(message = "Workspace members can only use assigned agents and dashboards.") {
    super(message);
    this.name = "MemberAccessDeniedError";
  }
}

export interface WorkspaceMemberAccess {
  allowedAgentIds: string[];
  allowedDashboardIds: string[];
  aiMessagesMonthlyLimit: number;
}

export function isWorkspaceMember(ctx: WorkspaceContext): boolean {
  return ctx.memberRole === "member";
}

export function canManageWorkspace(ctx: WorkspaceContext): boolean {
  return ctx.memberRole === "owner" || ctx.memberRole === "admin";
}

export function assertCanManageWorkspace(ctx: WorkspaceContext): void {
  if (!canManageWorkspace(ctx)) {
    throw new MemberAccessDeniedError(
      "Only workspace owners and admins can manage team members."
    );
  }
}

export function assertMemberCanMutate(ctx: WorkspaceContext): void {
  if (isWorkspaceMember(ctx)) {
    throw new MemberAccessDeniedError();
  }
}

export async function getMemberAccess(
  ctx: WorkspaceContext
): Promise<WorkspaceMemberAccess | null> {
  if (!isWorkspaceMember(ctx)) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subaccount_permissions")
    .select(
      "allowed_agent_ids, allowed_dashboard_ids, ai_messages_monthly_limit"
    )
    .eq("subaccount_id", ctx.userId)
    .eq("workspace_id", ctx.workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      allowedAgentIds: [],
      allowedDashboardIds: [],
      aiMessagesMonthlyLimit: 50,
    };
  }

  return {
    allowedAgentIds: (data.allowed_agent_ids ?? []) as string[],
    allowedDashboardIds: (data.allowed_dashboard_ids ?? []) as string[],
    aiMessagesMonthlyLimit: data.ai_messages_monthly_limit ?? 50,
  };
}

export function filterByMemberAccess<T extends { id: string }>(
  items: T[],
  allowedIds: string[]
): T[] {
  if (allowedIds.length === 0) return [];
  const allowed = new Set(allowedIds);
  return items.filter((item) => allowed.has(item.id));
}

export async function assertMemberCanUseAgent(
  ctx: WorkspaceContext,
  agentId: string
): Promise<void> {
  const access = await getMemberAccess(ctx);
  if (!access) return;
  if (!access.allowedAgentIds.includes(agentId)) {
    throw new MemberAccessDeniedError("You do not have access to this agent.");
  }
}

export async function assertMemberCanUseDashboard(
  ctx: WorkspaceContext,
  dashboardId: string
): Promise<void> {
  const access = await getMemberAccess(ctx);
  if (!access) return;
  if (!access.allowedDashboardIds.includes(dashboardId)) {
    throw new MemberAccessDeniedError(
      "You do not have access to this dashboard."
    );
  }
}

export function memberAccessDeniedResponse(err: unknown): Response {
  const message =
    err instanceof MemberAccessDeniedError
      ? err.message
      : "Forbidden";
  return Response.json({ error: message }, { status: 403 });
}
