export const ACTIVE_AGENT_STORAGE_KEY = "monzi:active-agent-id";

export function readStoredActiveAgentId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY);
}

export function writeStoredActiveAgentId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, id);
}
