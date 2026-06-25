import type { AgentTurnContext } from "@/lib/agents/run-agent-turn";
import type { VoiceSessionPayload } from "@/lib/voice/session-token";

const TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const contextByConversation = new Map<string, CacheEntry<AgentTurnContext>>();
const sessionByUser = new Map<string, CacheEntry<VoiceSessionPayload>>();

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return Boolean(entry && entry.expires > Date.now());
}

export function cacheVoiceContext(
  conversationId: string,
  ctx: AgentTurnContext
): void {
  contextByConversation.set(conversationId, {
    value: ctx,
    expires: Date.now() + TTL_MS,
  });
}

export function getCachedVoiceContext(
  conversationId: string
): AgentTurnContext | null {
  const entry = contextByConversation.get(conversationId);
  if (!isFresh(entry)) {
    contextByConversation.delete(conversationId);
    return null;
  }
  return entry.value;
}

export function registerVoiceSession(payload: VoiceSessionPayload): void {
  sessionByUser.set(payload.userId, {
    value: payload,
    expires: Date.now() + TTL_MS,
  });
}

export function getActiveVoiceSession(
  userId: string
): VoiceSessionPayload | null {
  const entry = sessionByUser.get(userId);
  if (!isFresh(entry)) {
    sessionByUser.delete(userId);
    return null;
  }
  return entry.value;
}
