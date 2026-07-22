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

const LOCAL_APP_URL =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

function resolvePublicAppBase(): string {
  const fromEnv =
    process.env.COMPOSIO_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv && !LOCAL_APP_URL.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  throw new Error(
    "COMPOSIO_PUBLIC_BASE_URL (or a non-local NEXT_PUBLIC_APP_URL) must be set for Composio OAuth redirects"
  );
}

/** Public app origin for Composio OAuth — never localhost. */
export function getAppPublicBaseUrl(): string {
  return resolvePublicAppBase();
}

export function getAppCallbackUrl(path: string): string {
  return `${resolvePublicAppBase()}${path}`;
}
