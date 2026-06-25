import type { DynamicStructuredTool } from "@langchain/core/tools";

import { getComposio, getComposioLangChain } from "@/lib/composio/client";

export async function listActiveConnections(userId: string) {
  const composio = getComposio();
  const response = await composio.connectedAccounts.list({
    userIds: [userId],
    statuses: ["ACTIVE"],
  });
  return response.items;
}

export async function getLangChainTools(
  userId: string,
  toolkits: string[]
): Promise<DynamicStructuredTool[]> {
  if (toolkits.length === 0) return [];

  const composio = getComposioLangChain();
  const tools = await composio.tools.get(userId, { toolkits });
  return tools as DynamicStructuredTool[];
}

export async function executeTool(
  userId: string,
  tool: string,
  params: Record<string, unknown> = {},
  connectedAccountId?: string
) {
  const composio = getComposio();
  return composio.tools.execute(tool, {
    userId,
    arguments: params,
    connectedAccountId,
    dangerouslySkipVersionCheck: true,
  });
}
