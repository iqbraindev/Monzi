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

/** Prevents duplicate parallel custom-LLM runs for the same user turn. */
const activeTurnKeys = new Set<string>();

export function voiceTurnKey(conversationId: string, userText: string): string {
  return `${conversationId}:${userText.trim().toLowerCase()}`;
}

export function tryAcquireVoiceTurn(key: string): boolean {
  if (activeTurnKeys.has(key)) return false;
  activeTurnKeys.add(key);
  return true;
}

export function releaseVoiceTurn(key: string): void {
  activeTurnKeys.delete(key);
}

const introSpokenFor = new Set<string>();
const inFlightTurnResults = new Map<string, Promise<string>>();

export function markVoiceIntroSpoken(conversationId: string): boolean {
  if (introSpokenFor.has(conversationId)) return false;
  introSpokenFor.add(conversationId);
  return true;
}

/** Allows the welcome line to play again on the next voice call. */
export function resetVoiceIntro(conversationId: string): void {
  introSpokenFor.delete(conversationId);
}

export function getInFlightVoiceTurnResult(
  key: string
): Promise<string> | undefined {
  return inFlightTurnResults.get(key);
}

export function registerInFlightVoiceTurnResult(
  key: string,
  promise: Promise<string>
): void {
  inFlightTurnResults.set(key, promise);
  void promise.finally(() => {
    if (inFlightTurnResults.get(key) === promise) {
      inFlightTurnResults.delete(key);
    }
  });
}
