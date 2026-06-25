import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  conversationId?: string | null
): Promise<string | undefined> {
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (data) return data.id;
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agentId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ user_id: userId, agent_id: agentId, title: "Chat" })
    .select("id")
    .single();

  return created?.id;
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  title = "Chat"
): Promise<string | undefined> {
  const { data } = await supabase
    .from("conversations")
    .insert({ user_id: userId, agent_id: agentId, title })
    .select("id")
    .single();
  return data?.id;
}
