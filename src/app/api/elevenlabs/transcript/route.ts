import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveWorkspaceContext } from "@/lib/workspaces/context";

/**
 * Persists a single spoken turn from an ElevenLabs voice call into the
 * conversation, so the live transcript stays in sync with the text chat.
 * ElevenLabs runs the LLM during voice calls, so turns aren't written through
 * the normal /api/chat pipeline — this route fills that gap.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await resolveWorkspaceContext(userId, { request: req });

    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      role?: "user" | "assistant";
      text?: string;
    };

    const { conversationId, role, text } = body;
    if (
      !conversationId ||
      (role !== "user" && role !== "assistant") ||
      !text?.trim()
    ) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("workspace_id", ctx.workspaceId)
      .maybeSingle();

    if (!conversation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role,
      content: text.trim(),
    });

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to persist transcript";
    console.error("[elevenlabs/transcript]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
