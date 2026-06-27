import type { WorkspaceContext } from "@/lib/workspaces/types";

/** Controls whether pre-workspace Clerk user connections may be used. */
export interface ComposioScopeOptions {
  legacyUserId?: string;
  /** When false, only `ws_{workspaceId}` connections are visible/usable. */
  allowLegacyFallback?: boolean;
}

export function getComposioScope(
  ctx: Pick<WorkspaceContext, "ownerUserId" | "isDefaultWorkspace">
): ComposioScopeOptions {
  return {
    legacyUserId: ctx.ownerUserId,
    allowLegacyFallback: ctx.isDefaultWorkspace,
  };
}

export function legacyFallbackEnabled(scope?: ComposioScopeOptions): boolean {
  return Boolean(scope?.allowLegacyFallback && scope.legacyUserId);
}
