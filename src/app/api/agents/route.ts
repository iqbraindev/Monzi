import { auth } from "@clerk/nextjs/server";

import {
  draftToDbRow,
  parseCreateAgentBody,
  type CreateAgentBody,
} from "@/lib/agents/api-body";
import { dbAgentToUiAgent, type DbAgent } from "@/lib/agents/adapter";
import {
  getUserAgentLimit,
  getUserVoiceEnabled,
} from "@/lib/billing/limits";
import {
  clampEnergyLimitForPlan,
  getPlanEnergyLimits,
} from "@/lib/billing/energy";
import {
  getConnectedToolkitSlugs,
} from "@/lib/composio/agent-toolkits";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agent"
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sync user account";
    return Response.json({ error: message }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data: agents, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const connectedToolkits = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );
  const voiceAllowed = await getUserVoiceEnabled(userId);
  const agentLimit = await getUserAgentLimit(userId);
  const uiAgents = (agents as DbAgent[]).map((a) =>
    dbAgentToUiAgent(a, 0, connectedToolkits, voiceAllowed)
  );
  return Response.json({
    agents: uiAgents,
    meta: {
      count: uiAgents.length,
      limit: agentLimit,
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateAgentBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const draft = parseCreateAgentBody(body);
  if (!draft.name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = `${toSlug(draft.name)}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await ensureSupabaseUser(userId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sync user account";
    return Response.json({ error: message }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  const agentLimit = await getUserAgentLimit(userId);
  if (agentLimit >= 0) {
    const { count } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) >= agentLimit) {
      return Response.json(
        {
          error: `Agent limit reached (${agentLimit}). Upgrade your plan to create more agents.`,
        },
        { status: 403 }
      );
    }
  }

  const voiceAllowed = await getUserVoiceEnabled(userId);
  if (!voiceAllowed) {
    draft.voice.enabled = false;
  }

  const connectedSlugs = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );
  draft.tools.composio_apps = filterComposioAppsForConnected(
    draft.tools.composio_apps,
    connectedSlugs
  );

  const planEnergy = await getPlanEnergyLimits(userId);
  draft.energy_limit_monthly = clampEnergyLimitForPlan(
    draft.energy_limit_monthly || planEnergy.defaultMonthly,
    planEnergy
  );

  const { data: agent, error } = await supabase
    .from("agents")
    .insert(draftToDbRow(draft, userId, slug))
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const connectedToolkits = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );

  const uiAgent = dbAgentToUiAgent(
    agent as DbAgent,
    0,
    connectedToolkits,
    voiceAllowed
  );
  return Response.json({ agent: uiAgent }, { status: 201 });
}
