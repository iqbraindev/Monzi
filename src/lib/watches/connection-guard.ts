import { listActiveConnections } from "@/lib/composio/tools";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import type { ComposioScopeOptions } from "@/lib/composio/scope";
import type { ConnectionGuardResult } from "@/lib/watches/types";

export async function checkToolkitConnection(
  workspaceId: string,
  toolkit: string,
  composioScope?: ComposioScopeOptions
): Promise<ConnectionGuardResult> {
  const slug = toolkit.toLowerCase();
  const connections = await listActiveConnections(workspaceId, composioScope);
  const connected = connections.some(
    (c) => c.toolkit?.slug?.toLowerCase() === slug
  );
  const appName = TOOLKIT_CATALOG[slug]?.name ?? slug;

  return {
    connected,
    toolkit: slug,
    appName,
    connectPath: `/integrations?connect=${encodeURIComponent(slug)}`,
  };
}
