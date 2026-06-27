import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const { conversationId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: row } = await supabase
      .from("conversations")
      .select("id, agent_id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) throw error;

    return Response.json({ ok: true, agentId: row.agent_id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete conversation";
    console.error("[conversations DELETE]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
