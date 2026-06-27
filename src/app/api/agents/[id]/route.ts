import { auth } from "@clerk/nextjs/server";

import { dbAgentToUiAgent, type DbAgent } from "@/lib/agents/adapter";
import {
  draftToDbUpdate,
  type PatchAgentBody,
} from "@/lib/agents/api-body";
import { getUserVoiceEnabled } from "@/lib/billing/limits";
import {
  clampEnergyLimitForPlan,
  getPlanEnergyLimits,
} from "@/lib/billing/energy";
import {
  getConnectedToolkitSlugs,
} from "@/lib/composio/agent-toolkits";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !agent) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const connectedToolkits = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );
  const voiceAllowed = await getUserVoiceEnabled(userId);

  return Response.json({
    agent: dbAgentToUiAgent(agent as DbAgent, 0, connectedToolkits, voiceAllowed),
    dbAgent: agent,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as PatchAgentBody;

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const voiceAllowed = await getUserVoiceEnabled(userId);
  if (!voiceAllowed && body.voice) {
    body.voice = { ...body.voice, enabled: false };
  }

  const connectedToolkits = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );

  if (body.tools?.composio_apps) {
    body.tools.composio_apps = filterComposioAppsForConnected(
      body.tools.composio_apps,
      connectedToolkits
    );
  }
  if (body.composio_apps) {
    body.composio_apps = filterComposioAppsForConnected(
      body.composio_apps,
      connectedToolkits
    );
  }

  if (typeof body.energy_limit_monthly === "number") {
    const planEnergy = await getPlanEnergyLimits(userId);
    body.energy_limit_monthly = clampEnergyLimitForPlan(
      body.energy_limit_monthly,
      planEnergy
    );
  }

  const update = draftToDbUpdate(body, {
    tools: existing.tools as PatchAgentBody["tools"],
    avatar: existing.avatar as PatchAgentBody["avatar"],
    personality: existing.personality as PatchAgentBody["personality"],
    voice: existing.voice as PatchAgentBody["voice"],
  });

  const { data: agent, error } = await supabase
    .from("agents")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !agent) {
    return Response.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return Response.json({
    agent: dbAgentToUiAgent(
      agent as DbAgent,
      0,
      connectedToolkits,
      voiceAllowed
    ),
    dbAgent: agent,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("agents")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  if (existing.is_default) {
    return Response.json(
      { error: "Your default agent cannot be deleted." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("agents")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
