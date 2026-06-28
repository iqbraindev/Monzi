import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface SubaccountPermissionsInput {
  allowedAgentIds?: string[];
  allowedDashboardIds?: string[];
  aiMessagesMonthlyLimit?: number;
}

export interface SubaccountMemberRow {
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_active: boolean;
  } | null;
  permissions: {
    allowedAgentIds: string[];
    allowedDashboardIds: string[];
    aiMessagesMonthlyLimit: number;
  } | null;
  status: "active" | "pending" | "suspended";
}

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<SubaccountMemberRow[]> {
  const supabase = getSupabaseAdmin();

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .in("role", ["member", "admin"]);

  if (error) throw new Error(error.message);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const [{ data: users, error: usersError }, { data: permissions, error: permError }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, email, full_name, avatar_url, is_active")
        .in("id", userIds),
      supabase
        .from("subaccount_permissions")
        .select(
          "subaccount_id, allowed_agent_ids, allowed_dashboard_ids, ai_messages_monthly_limit"
        )
        .eq("workspace_id", workspaceId)
        .in("subaccount_id", userIds),
    ]);

  if (usersError) throw new Error(usersError.message);
  if (permError) throw new Error(permError.message);

  const usersById = new Map((users ?? []).map((u) => [u.id, u]));
  const permsByUser = new Map(
    (permissions ?? []).map((p) => [
      p.subaccount_id,
      {
        allowedAgentIds: (p.allowed_agent_ids ?? []) as string[],
        allowedDashboardIds: (p.allowed_dashboard_ids ?? []) as string[],
        aiMessagesMonthlyLimit: p.ai_messages_monthly_limit ?? 50,
      },
    ])
  );

  return (members ?? []).map((m) => {
    const user = usersById.get(m.user_id) ?? null;
    const isPending = user?.id.startsWith("invite_") || user?.is_active === false;
    const status: SubaccountMemberRow["status"] = user?.is_active === false && !isPending
      ? "suspended"
      : isPending
        ? "pending"
        : "active";

    return {
      userId: m.user_id,
      role: m.role,
      createdAt: m.created_at,
      user: user
        ? {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
          }
        : null,
      permissions: permsByUser.get(m.user_id) ?? null,
      status,
    };
  });
}

export async function upsertMemberPermissions(
  workspaceId: string,
  subaccountId: string,
  ownerUserId: string,
  input: SubaccountPermissionsInput
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("subaccount_permissions").upsert(
    {
      subaccount_id: subaccountId,
      workspace_id: workspaceId,
      parent_user_id: ownerUserId,
      allowed_agent_ids: input.allowedAgentIds ?? [],
      allowed_dashboard_ids: input.allowedDashboardIds ?? [],
      can_create_agents: false,
      can_connect_integrations: false,
      can_edit_dashboards: false,
      ai_messages_monthly_limit: input.aiMessagesMonthlyLimit ?? 50,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subaccount_id,workspace_id" }
  );

  if (error) throw new Error(error.message);
}

export async function removeWorkspaceMember(
  workspaceId: string,
  memberUserId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error: memberError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", memberUserId)
    .eq("role", "member");

  if (memberError) throw new Error(memberError.message);

  await supabase
    .from("subaccount_permissions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("subaccount_id", memberUserId);
}

export async function findUserByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id, role, is_active")
    .eq("email", email)
    .maybeSingle();
  return data;
}

export async function createInvitePlaceholder(
  email: string,
  fullName?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const memberUserId = `invite_${crypto.randomUUID()}`;

  const { error } = await supabase.from("users").insert({
    id: memberUserId,
    email,
    full_name: fullName?.trim() || email.split("@")[0],
    role: "subaccount",
    is_active: false,
  });

  if (error) throw new Error(error.message);
  return memberUserId;
}

export async function addMemberToWorkspace(
  workspaceId: string,
  memberUserId: string,
  role: "member" | "admin" = "member"
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: memberUserId,
      role,
    },
    { onConflict: "workspace_id,user_id" }
  );

  if (error) throw new Error(error.message);
}
