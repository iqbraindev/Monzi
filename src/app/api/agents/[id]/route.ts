import { auth } from "@clerk/nextjs/server";

import { dbAgentToUiAgent, type DbAgent } from "@/lib/agents/adapter";
import { getUserVoiceEnabled } from "@/lib/billing/limits";
import {
  assignToolkitToAgents,
  getConnectedToolkitSlugs,
} from "@/lib/composio/agent-toolkits";
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
  const body = (await req.json()) as {
    composio_apps?: string[];
    name?: string;
    is_active?: boolean;
  };

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("agents")
    .select("tools")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  const tools = (existing.tools ?? {}) as { composio_apps?: string[] };
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.composio_apps) {
    update.tools = { ...tools, composio_apps: body.composio_apps };
  }
  if (body.name) update.name = body.name;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;

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

  const voiceAllowed = await getUserVoiceEnabled(userId);
  return Response.json({
    agent: dbAgentToUiAgent(agent as DbAgent, 0, [], voiceAllowed),
  });
}
