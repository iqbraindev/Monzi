import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import { listActiveConnections } from "@/lib/composio/tools";

type AgentTools = { composio_apps?: string[] };

export async function getConnectedToolkitSlugs(
  workspaceId: string,
  scope?: ComposioScopeOptions
): Promise<string[]> {
  const connections = await listActiveConnections(workspaceId, scope);
  return [
    ...new Set(
      connections
        .map((c) => c.toolkit?.slug)
        .filter((slug): slug is string => Boolean(slug))
    ),
  ];
}

export async function assignToolkitToAgents(
  workspaceId: string,
  toolkit: string,
  agentIds?: string[]
) {
  const supabase = getSupabaseAdmin();

  let targetIds = agentIds?.filter(Boolean) ?? [];
  if (targetIds.length === 0) {
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .eq("workspace_id", workspaceId);
    targetIds = (agents ?? []).map((a) => a.id);
  }

  for (const agentId of targetIds) {
    const { data: agent } = await supabase
      .from("agents")
      .select("tools")
      .eq("id", agentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!agent) continue;

    const tools = (agent.tools ?? {}) as AgentTools;
    const apps = new Set(tools.composio_apps ?? []);
    apps.add(toolkit);

    await supabase
      .from("agents")
      .update({
        tools: { ...tools, composio_apps: Array.from(apps) },
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId)
      .eq("workspace_id", workspaceId);
  }
}

export async function removeToolkitFromAgents(
  workspaceId: string,
  toolkit: string
) {
  const supabase = getSupabaseAdmin();
  const { data: agents } = await supabase
    .from("agents")
    .select("id, tools")
    .eq("workspace_id", workspaceId);

  if (!agents) return;

  for (const agent of agents) {
    const tools = (agent.tools ?? {}) as AgentTools;
    const apps = (tools.composio_apps ?? []).filter((a) => a !== toolkit);
    if (apps.length === (tools.composio_apps ?? []).length) continue;

    await supabase
      .from("agents")
      .update({
        tools: { ...tools, composio_apps: apps },
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);
  }
}

export async function syncAllConnectionsToAgents(
  workspaceId: string,
  toolkits: string[]
) {
  for (const toolkit of toolkits) {
    await assignToolkitToAgents(workspaceId, toolkit);
  }
}
