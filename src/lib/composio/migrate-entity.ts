/**
 * Composio OAuth connections are scoped per workspace using entity IDs `ws_{workspaceId}`.
 *
 * Migration notes:
 * - Existing connections created before workspace tenancy used the Clerk user ID as the Composio entity.
 * - Legacy fallback applies only to the account default workspace (not secondary workspaces).
 * - New workspaces require connecting integrations again in Integrations for that workspace.
 * - To fully migrate default workspace connections, disconnect and reconnect each app once after upgrading.
 */

import { getComposioEntityId, getLegacyComposioEntityId } from "@/lib/composio/entity-id";
import { listActiveConnections } from "@/lib/composio/tools";

export async function describeComposioMigrationState(
  workspaceId: string,
  ownerUserId: string,
  isDefaultWorkspace: boolean
) {
  const workspaceOnlyScope = { allowLegacyFallback: false };
  const defaultScope = {
    legacyUserId: ownerUserId,
    allowLegacyFallback: isDefaultWorkspace,
  };

  const workspaceEntityConnections = await listActiveConnections(
    workspaceId,
    workspaceOnlyScope
  );
  const effectiveConnections = await listActiveConnections(
    workspaceId,
    defaultScope
  );

  return {
    workspaceEntityId: getComposioEntityId(workspaceId),
    legacyEntityId: getLegacyComposioEntityId(ownerUserId),
    workspaceConnectionCount: workspaceEntityConnections.length,
    effectiveConnectionCount: effectiveConnections.length,
    legacyFallbackActive:
      isDefaultWorkspace &&
      workspaceEntityConnections.length === 0 &&
      effectiveConnections.length > 0,
    reconnectRequiredForNewWorkspaces: true,
  };
}
