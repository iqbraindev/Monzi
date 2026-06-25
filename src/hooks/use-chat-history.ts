import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";

interface ChatHistoryResponse {
  conversationId: string | null;
  messages: UIMessage[];
}

async function fetchChatHistory(agentId: string): Promise<ChatHistoryResponse> {
  const res = await fetch(`/api/chat/${agentId}/history`);
  if (!res.ok) {
    throw new Error("Failed to load chat history");
  }
  return (await res.json()) as ChatHistoryResponse;
}

export function useChatHistory(agentId: string | undefined) {
  return useQuery({
    queryKey: ["chat-history", agentId],
    queryFn: () => fetchChatHistory(agentId!),
    enabled: Boolean(agentId),
    staleTime: 0,
  });
}

export function useInvalidateChatHistory() {
  const qc = useQueryClient();
  return (agentId: string) =>
    qc.invalidateQueries({ queryKey: ["chat-history", agentId] });
}
