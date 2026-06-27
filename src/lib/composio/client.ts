import { Composio } from "@composio/core";
import { LangchainProvider } from "@composio/langchain";

import { getPlatformSecret } from "@/lib/platform/config";

let composioClient: Composio | null = null;
let composioLangChainClient: Composio<LangchainProvider> | null = null;
let composioClientKey: string | null = null;

export function resetComposioClients(): void {
  composioClient = null;
  composioLangChainClient = null;
  composioClientKey = null;
}

export async function getComposioApiKey(): Promise<string> {
  const key = await getPlatformSecret("composio.api_key");
  if (!key) {
    throw new Error("COMPOSIO_API_KEY is not configured");
  }
  return key;
}

/** Base Composio client for connections, auth configs, and tool execution. */
export async function getComposio() {
  const apiKey = await getComposioApiKey();
  if (composioClient && composioClientKey === apiKey) {
    return composioClient;
  }
  composioClient = new Composio({
    apiKey,
    host: process.env.NEXT_PUBLIC_APP_NAME ?? "Monzi",
    toolkitVersions: "latest",
  });
  composioClientKey = apiKey;
  return composioClient;
}

/** Composio client with LangChain provider for agent chat tools. */
export async function getComposioLangChain() {
  const apiKey = await getComposioApiKey();
  if (composioLangChainClient && composioClientKey === apiKey) {
    return composioLangChainClient;
  }
  composioLangChainClient = new Composio({
    apiKey,
    host: process.env.NEXT_PUBLIC_APP_NAME ?? "Monzi",
    provider: new LangchainProvider(),
    toolkitVersions: "latest",
  });
  composioClientKey = apiKey;
  return composioLangChainClient;
}

export function getAppCallbackUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
