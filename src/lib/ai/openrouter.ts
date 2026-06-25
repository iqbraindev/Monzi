import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const PLACEHOLDER_KEY_PATTERN = /^(sk-or-xxx|xxx)$/i;

export function getOpenRouterRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appName = process.env.NEXT_PUBLIC_APP_NAME;
  if (appUrl) headers["HTTP-Referer"] = appUrl;
  if (appName) headers["X-Title"] = appName;
  return headers;
}

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key || PLACEHOLDER_KEY_PATTERN.test(key)) {
    throw new Error(
      "Your Ai credits are not sufficient. Please add more credits to your account."
    );
  }
  return key;
}

/** Vercel AI SDK provider configured for OpenRouter */
export function createOpenRouterProvider() {
  return createOpenRouter({
    apiKey: getOpenRouterApiKey(),
    headers: getOpenRouterRequestHeaders(),
  });
}

/** LangChain chat model via OpenRouter */
export function createOpenRouterChatModel(model?: string) {
  return new ChatOpenAI({
    model: model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o",
    apiKey: getOpenRouterApiKey(),
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: getOpenRouterRequestHeaders(),
    },
  });
}

export const openRouterModels = {
  primary: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o",
  fast: process.env.OPENROUTER_MODEL_FAST ?? "openai/gpt-4o-mini",
  longContext:
    process.env.OPENROUTER_MODEL_LONG ?? "anthropic/claude-sonnet-4",
  embedding:
    process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
} as const;
