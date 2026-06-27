import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";
import {
  countOwnedWorkspaces,
} from "@/lib/workspaces/service";
import type { LimitExceededError } from "@/lib/workspaces/types";
import { limitExceeded } from "@/lib/workspaces/types";

interface PackLimitRow {
  max_workspaces: number;
  max_agents: number;
  max_dashboards: number;
  max_widgets_per_dashboard: number;
  max_integrations: number;
  max_subaccounts: number;
  ai_messages_per_month: number;
  ai_messages_per_day: number;
}

async function getOwnerPackLimits(ownerUserId: string): Promise<PackLimitRow> {
  const supabase = getSupabaseAdmin();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("pack_id, custom_limits")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  const custom = subscription?.custom_limits as Partial<PackLimitRow> | null;

  const defaults: PackLimitRow = {
    max_workspaces: 1,
    max_agents: 1,
    max_dashboards: 1,
    max_widgets_per_dashboard: 5,
    max_integrations: 1,
    max_subaccounts: 0,
    ai_messages_per_month: 50,
    ai_messages_per_day: 10,
  };

  if (!subscription?.pack_id) {
    return { ...defaults, ...custom };
  }

  const { data: limits } = await supabase
    .from("pack_limits")
    .select(
      "max_workspaces, max_agents, max_dashboards, max_widgets_per_dashboard, max_integrations, max_subaccounts, ai_messages_per_month, ai_messages_per_day"
    )
    .eq("pack_id", subscription.pack_id)
    .maybeSingle();

  return {
    ...defaults,
    ...(limits as PackLimitRow | null),
    ...custom,
  };
}

function isUnlimited(value: number): boolean {
  return value < 0;
}

function isDevUnlimited(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function canCreateWorkspace(
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_workspaces)) return { ok: true };

  const current = await countOwnedWorkspaces(ownerUserId);
  if (current >= limits.max_workspaces) {
    return {
      ok: false,
      error: limitExceeded(
        "max_workspaces",
        current,
        limits.max_workspaces,
        `Workspace limit reached (${limits.max_workspaces}). Upgrade your plan to create more workspaces.`
      ),
    };
  }

  return { ok: true };
}

export async function canCreateAgent(
  workspaceId: string,
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_agents)) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const current = count ?? 0;
  if (current >= limits.max_agents) {
    return {
      ok: false,
      error: limitExceeded(
        "max_agents",
        current,
        limits.max_agents,
        `Agent limit reached (${limits.max_agents}) for this workspace. Upgrade your plan to create more agents.`
      ),
    };
  }

  return { ok: true };
}

export async function canCreateDashboard(
  workspaceId: string,
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_dashboards)) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("dashboards")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const current = count ?? 0;
  if (current >= limits.max_dashboards) {
    return {
      ok: false,
      error: limitExceeded(
        "max_dashboards",
        current,
        limits.max_dashboards,
        `Dashboard limit reached (${limits.max_dashboards}) for this workspace.`
      ),
    };
  }

  return { ok: true };
}

export async function canCreateWidget(
  workspaceId: string,
  ownerUserId: string,
  dashboardId: string
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_widgets_per_dashboard)) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { data: dashboard } = await supabase
    .from("dashboards")
    .select("id")
    .eq("id", dashboardId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!dashboard) {
    return {
      ok: false,
      error: limitExceeded(
        "max_widgets_per_dashboard",
        0,
        limits.max_widgets_per_dashboard,
        "Dashboard not found"
      ),
    };
  }

  const { count } = await supabase
    .from("widgets")
    .select("id", { count: "exact", head: true })
    .eq("dashboard_id", dashboardId);

  const current = count ?? 0;
  if (current >= limits.max_widgets_per_dashboard) {
    return {
      ok: false,
      error: limitExceeded(
        "max_widgets_per_dashboard",
        current,
        limits.max_widgets_per_dashboard,
        `Widget limit reached (${limits.max_widgets_per_dashboard}) for this dashboard.`
      ),
    };
  }

  return { ok: true };
}

export async function canConnectIntegration(
  workspaceId: string,
  ownerUserId: string,
  composioScope: ComposioScopeOptions
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_integrations)) return { ok: true };

  const connections = await listActiveConnections(workspaceId, composioScope);
  const current = connections.length;

  if (current >= limits.max_integrations) {
    return {
      ok: false,
      error: limitExceeded(
        "max_integrations",
        current,
        limits.max_integrations,
        `Integration limit reached (${limits.max_integrations}) for this workspace.`
      ),
    };
  }

  return { ok: true };
}

export async function canCreateSubaccount(
  workspaceId: string,
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: LimitExceededError }> {
  if (isDevUnlimited()) return { ok: true };

  const limits = await getOwnerPackLimits(ownerUserId);
  if (isUnlimited(limits.max_subaccounts)) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "member");

  const current = count ?? 0;
  if (current >= limits.max_subaccounts) {
    return {
      ok: false,
      error: limitExceeded(
        "max_subaccounts",
        current,
        limits.max_subaccounts,
        `Subaccount seat limit reached (${limits.max_subaccounts}) for this workspace.`
      ),
    };
  }

  return { ok: true };
}

export async function getWorkspaceLimitsSnapshot(
  workspaceId: string,
  ownerUserId: string,
  composioScope: ComposioScopeOptions
) {
  const limits = await getOwnerPackLimits(ownerUserId);
  const supabase = getSupabaseAdmin();

  const [
    workspaceCount,
    agentCount,
    dashboardCount,
    memberCount,
    connections,
    usageRes,
  ] = await Promise.all([
    countOwnedWorkspaces(ownerUserId),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("dashboards")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("role", "member"),
    listActiveConnections(workspaceId, composioScope).catch(() => []),
    supabase
      .from("usage_tracking")
      .select("ai_messages_used, integrations_connected, agents_created")
      .eq("workspace_id", workspaceId)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    limits,
    usage: {
      workspaces: workspaceCount,
      agents: agentCount.count ?? 0,
      dashboards: dashboardCount.count ?? 0,
      integrations: connections.length,
      subaccounts: memberCount.count ?? 0,
      ai_messages_used: usageRes.data?.ai_messages_used ?? 0,
    },
  };
}

export { getOwnerPackLimits };
