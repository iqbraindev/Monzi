import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listActiveConnections } from "@/lib/composio/tools";

type AgentTools = { composio_apps?: string[] };

export async function getConnectedToolkitSlugs(userId: string): Promise<string[]> {
  const connections = await listActiveConnections(userId);
  return [
    ...new Set(
      connections
        .map((c) => c.toolkit?.slug)
        .filter((slug): slug is string => Boolean(slug))
    ),
  ];
}

export async function assignToolkitToAgents(
  userId: string,
  toolkit: string,
  agentIds?: string[]
) {
  const supabase = getSupabaseAdmin();

  let targetIds = agentIds?.filter(Boolean) ?? [];
  if (targetIds.length === 0) {
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId);
    targetIds = (agents ?? []).map((a) => a.id);
  }

  for (const agentId of targetIds) {
    const { data: agent } = await supabase
      .from("agents")
      .select("tools")
      .eq("id", agentId)
      .eq("user_id", userId)
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
      .eq("user_id", userId);
  }
}

export async function removeToolkitFromAgents(userId: string, toolkit: string) {
  const supabase = getSupabaseAdmin();
  const { data: agents } = await supabase
    .from("agents")
    .select("id, tools")
    .eq("user_id", userId);

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

/** Assign every active Composio connection to all of the user's agents. */
export async function syncAllConnectionsToAgents(
  userId: string,
  toolkits: string[]
) {
  for (const toolkit of toolkits) {
    await assignToolkitToAgents(userId, toolkit);
  }
}
