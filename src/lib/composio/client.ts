import { Composio } from "@composio/core";
import { LangchainProvider } from "@composio/langchain";

let composioClient: Composio | null = null;
let composioLangChainClient: Composio<LangchainProvider> | null = null;

export function getComposioApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    throw new Error("COMPOSIO_API_KEY is not configured");
  }
  return key;
}

/** Base Composio client for connections, auth configs, and tool execution. */
export function getComposio() {
  if (!composioClient) {
    composioClient = new Composio({
      apiKey: getComposioApiKey(),
      host: process.env.NEXT_PUBLIC_APP_NAME ?? "Monzi",
      toolkitVersions: "latest",
    });
  }
  return composioClient;
}

/** Composio client with LangChain provider for agent chat tools. */
export function getComposioLangChain() {
  if (!composioLangChainClient) {
    composioLangChainClient = new Composio({
      apiKey: getComposioApiKey(),
      host: process.env.NEXT_PUBLIC_APP_NAME ?? "Monzi",
      provider: new LangchainProvider(),
      toolkitVersions: "latest",
    });
  }
  return composioLangChainClient;
}

export function getAppCallbackUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
