/** Composio entity scoped to a workspace (isolated OAuth tokens per workspace). */
export function getComposioEntityId(workspaceId: string): string {
  return `ws_${workspaceId}`;
}

/** Legacy Clerk user ID — only used as fallback on the default workspace. */
export function getLegacyComposioEntityId(userId: string): string {
  return userId;
}
