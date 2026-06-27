import { auth } from "@clerk/nextjs/server";

import { dbMessagesToUiMessages } from "@/lib/chat/message-mapper";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);
    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const { agentId } = await params;
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    const supabase = getSupabaseAdmin();

    const { data: agentRow } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!agentRow) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    let convoQuery = supabase
      .from("conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("workspace_id", ctx.workspaceId);

    if (conversationId) {
      convoQuery = convoQuery.eq("id", conversationId);
    } else {
      convoQuery = convoQuery.order("updated_at", { ascending: false }).limit(1);
    }

    const { data: conversation } = await convoQuery.maybeSingle();

    if (!conversation) {
      return Response.json({ conversationId: null, messages: [] });
    }

    const { data: rows } = await supabase
      .from("messages")
      .select("id, role, content, tool_calls, tool_results, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    return Response.json({
      conversationId: conversation.id,
      messages: dbMessagesToUiMessages(rows ?? []),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load history";
    console.error("[chat/history]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
