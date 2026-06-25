import { auth } from "@clerk/nextjs/server";

import { dbAgentToUiAgent, type DbAgent } from "@/lib/agents/adapter";
import { getUserVoiceEnabled } from "@/lib/billing/limits";
import {
  assignToolkitToAgents,
  getConnectedToolkitSlugs,
} from "@/lib/composio/agent-toolkits";
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
  const uiAgents = (agents as DbAgent[]).map((a) =>
    dbAgentToUiAgent(a, 0, connectedToolkits, voiceAllowed)
  );
  return Response.json({ agents: uiAgents });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; role?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const role = body.role?.trim() || "general_assistant";
  const color = body.color?.trim() || "#7C3AED";
  const slug = `${toSlug(name)}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await ensureSupabaseUser(userId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sync user account";
    return Response.json({ error: message }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      user_id: userId,
      name,
      slug,
      role,
      avatar: {
        style: "lottie",
        asset_id: "avatar-01",
        primary_color: color,
        background_color: "#1e1b4b",
      },
      is_default: false,
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const connectedToolkits = await getConnectedToolkitSlugs(userId).catch(
    () => [] as string[]
  );
  for (const toolkit of connectedToolkits) {
    await assignToolkitToAgents(userId, toolkit, [agent.id]);
  }

  const uiAgent = dbAgentToUiAgent(
    agent as DbAgent,
    0,
    connectedToolkits,
    await getUserVoiceEnabled(userId)
  );
  return Response.json({ agent: uiAgent }, { status: 201 });
}
