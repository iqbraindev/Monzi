import { auth } from "@clerk/nextjs/server";

import { loadAgentForUser } from "@/lib/agents/run-agent-turn";
import { getAgentEnergyStats } from "@/lib/billing/energy";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const { id } = await params;
    const agent = await loadAgentForUser(userId, id);
    if (!agent) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const stats = await getAgentEnergyStats(userId, agent);
    return Response.json(stats);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load energy stats";
    console.error("[agents/energy]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
