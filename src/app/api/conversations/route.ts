import { auth } from "@clerk/nextjs/server";

import { createConversation } from "@/lib/chat/conversation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureSupabaseUser } from "@/lib/users/provision";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSupabaseUser(userId);

    const agentId = new URL(req.url).searchParams.get("agentId");
    if (!agentId) {
      return Response.json({ error: "agentId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: agentRow } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!agentRow) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at, created_at")
      .eq("agent_id", agentId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const ids = (conversations ?? []).map((c) => c.id);
    const previewByConvo = new Map<string, string>();

    if (ids.length > 0) {
      const { data: messages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });

      for (const row of messages ?? []) {
        if (!previewByConvo.has(row.conversation_id) && row.content?.trim()) {
          previewByConvo.set(row.conversation_id, row.content.trim());
        }
      }
    }

    return Response.json({
      conversations: (conversations ?? []).map((c) => ({
        id: c.id,
        title: c.title ?? "Chat",
        updatedAt: c.updated_at,
        createdAt: c.created_at,
        preview: previewByConvo.get(c.id) ?? null,
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list conversations";
    console.error("[conversations GET]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}

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
