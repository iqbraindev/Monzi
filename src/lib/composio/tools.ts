import type { DynamicStructuredTool } from "@langchain/core/tools";

import { getComposio, getComposioLangChain } from "@/lib/composio/client";
import {
  getComposioEntityId,
  getLegacyComposioEntityId,
} from "@/lib/composio/entity-id";
import {
  legacyFallbackEnabled,
  type ComposioScopeOptions,
} from "@/lib/composio/scope";

async function listByEntity(entityId: string) {
  const composio = await getComposio();
  const response = await composio.connectedAccounts.list({
    userIds: [entityId],
    statuses: ["ACTIVE"],
  });
  return response.items;
}

/** List active connections for a workspace (legacy fallback only on default workspace). */
export async function listActiveConnections(
  workspaceId: string,
  scope?: ComposioScopeOptions
) {
  const entityId = getComposioEntityId(workspaceId);
  const items = await listByEntity(entityId);

  if (items.length > 0 || !legacyFallbackEnabled(scope)) {
    return items;
  }

  return listByEntity(getLegacyComposioEntityId(scope!.legacyUserId!));
}

export async function getLangChainTools(
  workspaceId: string,
  toolkits: string[],
  scope?: ComposioScopeOptions
): Promise<DynamicStructuredTool[]> {
  if (toolkits.length === 0) return [];

  const composio = await getComposioLangChain();
  const entityId = getComposioEntityId(workspaceId);

  try {
    const tools = await composio.tools.get(entityId, { toolkits });
    if (tools.length > 0 || !legacyFallbackEnabled(scope)) {
      return tools as DynamicStructuredTool[];
    }
  } catch {
    if (!legacyFallbackEnabled(scope)) {
      throw new Error("Failed to load Composio tools");
    }
  }

  if (legacyFallbackEnabled(scope)) {
    const tools = await composio.tools.get(
      getLegacyComposioEntityId(scope!.legacyUserId!),
      { toolkits }
    );
    return tools as DynamicStructuredTool[];
  }

  return [];
}

export async function executeTool(
  workspaceId: string,
  tool: string,
  params: Record<string, unknown> = {},
  connectedAccountId?: string,
  scope?: ComposioScopeOptions
) {
  const composio = await getComposio();
  const entityId = getComposioEntityId(workspaceId);

  try {
    return await composio.tools.execute(tool, {
      userId: entityId,
      arguments: params,
      connectedAccountId,
      dangerouslySkipVersionCheck: true,
    });
  } catch (err) {
    if (!legacyFallbackEnabled(scope)) throw err;
    return composio.tools.execute(tool, {
      userId: getLegacyComposioEntityId(scope!.legacyUserId!),
      arguments: params,
      connectedAccountId,
      dangerouslySkipVersionCheck: true,
    });
  }
}

/** Initiate OAuth using workspace-scoped Composio entity. */
export async function initiateConnection(
  workspaceId: string,
  authConfigId: string,
  callbackUrl: string
) {
  const composio = await getComposio();
  return composio.connectedAccounts.initiate(
    getComposioEntityId(workspaceId),
    authConfigId,
    { callbackUrl }
  );
}

/** Delete a connection owned by this workspace (legacy lookup only on default workspace). */
export async function deleteConnectionForWorkspace(
  workspaceId: string,
  connectionId: string,
  scope?: ComposioScopeOptions
) {
  const composio = await getComposio();
  const entityIds = [getComposioEntityId(workspaceId)];
  if (legacyFallbackEnabled(scope)) {
    entityIds.push(getLegacyComposioEntityId(scope!.legacyUserId!));
  }

  const response = await composio.connectedAccounts.list({
    userIds: entityIds,
    statuses: ["ACTIVE"],
  });

  const owned = response.items.some((item) => item.id === connectionId);
  if (!owned) {
    throw new Error("Connection not found");
  }

  await composio.connectedAccounts.delete(connectionId);
}
