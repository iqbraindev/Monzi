import { auth } from "@clerk/nextjs/server";

import { createConversation } from "@/lib/chat/conversation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const body = (await req.json()) as { agentId?: string; title?: string };
    if (!body.agentId) {
      return Response.json({ error: "agentId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: agentRow } = await supabase
      .from("agents")
      .select("id")
      .eq("id", body.agentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!agentRow) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const conversationId = await createConversation(
      supabase,
      userId,
      body.agentId,
      body.title ?? "New chat"
    );

    return Response.json({ conversationId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create conversation";
    console.error("[conversations]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
