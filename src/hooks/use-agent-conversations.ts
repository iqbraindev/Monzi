import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AgentConversation {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  preview: string | null;
}

async function fetchAgentConversations(
  agentId: string
): Promise<AgentConversation[]> {
  const res = await fetch(`/api/conversations?agentId=${agentId}`);
  if (!res.ok) throw new Error("Failed to load conversations");
  const data = (await res.json()) as { conversations?: AgentConversation[] };
  return data.conversations ?? [];
}

export function useAgentConversations(agentId: string) {
  return useQuery({
    queryKey: ["agent-conversations", agentId],
    queryFn: () => fetchAgentConversations(agentId),
    staleTime: 10_000,
  });
}

export function useInvalidateAgentConversations() {
  const qc = useQueryClient();
  return (agentId: string) =>
    qc.invalidateQueries({ queryKey: ["agent-conversations", agentId] });
}

export async function deleteAgentConversation(
  conversationId: string
): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to delete conversation");
  }
}
