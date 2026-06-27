import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ChatOpenAI } from "@langchain/openai";
import type { LanguageModel } from "ai";

import { isFreeLlmModel, normalizeLlmModel } from "@/lib/agents/llm-models";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const PLACEHOLDER_KEY_PATTERN = /^(sk-or-xxx|xxx)$/i;
const CREDITS_CACHE_MS = 60_000;

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
  /** Used when paid credits are exhausted (must be a :free or zero-cost model). */
  fallback:
    process.env.OPENROUTER_MODEL_FALLBACK?.trim() ||
    "cohere/north-mini-code:free",
  longContext:
    process.env.OPENROUTER_MODEL_LONG ?? "anthropic/claude-sonnet-4",
  embedding:
    process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
} as const;

interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
}

let creditsCache: { data: OpenRouterCredits; fetchedAt: number } | null = null;
let forceFallbackUntil = 0;

function isFallbackEnabled(): boolean {
  const fallback = openRouterModels.fallback;
  return Boolean(fallback && fallback !== "none" && fallback !== "off");
}

async function fetchOpenRouterCredits(): Promise<OpenRouterCredits | null> {
  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/credits`, {
      headers: {
        Authorization: `Bearer ${getOpenRouterApiKey()}`,
        ...getOpenRouterRequestHeaders(),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: OpenRouterCredits };
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function getOpenRouterCredits(): Promise<OpenRouterCredits | null> {
  const now = Date.now();
  if (creditsCache && now - creditsCache.fetchedAt < CREDITS_CACHE_MS) {
    return creditsCache.data;
  }
  const data = await fetchOpenRouterCredits();
  if (data) creditsCache = { data, fetchedAt: now };
  return data;
}

/** Call after a 402 so the next request skips the paid model immediately. */
export function markOpenRouterCreditsExhausted() {
  forceFallbackUntil = Date.now() + CREDITS_CACHE_MS;
  if (creditsCache?.data) {
    creditsCache = {
      data: {
        ...creditsCache.data,
        total_usage: creditsCache.data.total_credits + 1,
      },
      fetchedAt: Date.now(),
    };
  }
}

export function isOpenRouterPaymentError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message} ${JSON.stringify("statusCode" in error ? error.statusCode : "")}`
      : String(error);
  const lower = text.toLowerCase();
  return (
    lower.includes("402") ||
    lower.includes("insufficient credits") ||
    lower.includes("payment required")
  );
}

async function hasPaidCreditsRemaining(): Promise<boolean> {
  if (Date.now() < forceFallbackUntil) return false;
  const credits = await getOpenRouterCredits();
  if (!credits) return true;
  return credits.total_usage < credits.total_credits;
}

function buildChatModel(modelId: string, withOpenRouterFallback?: string): LanguageModel {
  const provider = createOpenRouterProvider();
  if (withOpenRouterFallback) {
    return provider.chat(modelId, { models: [withOpenRouterFallback] });
  }
  return provider.chat(modelId);
}

/**
 * Picks the agent's preferred model, respecting credit limits for paid models.
 * Free models (e.g. `:free` suffix) are always used as-is.
 */
export async function resolveAgentChatModel(
  preferredModelId?: string | null
): Promise<LanguageModel> {
  const modelId = normalizeLlmModel(preferredModelId);
  const { fallback } = openRouterModels;

  if (isFreeLlmModel(modelId)) {
    return buildChatModel(modelId);
  }

  if (!isFallbackEnabled()) {
    return buildChatModel(modelId);
  }

  if (await hasPaidCreditsRemaining()) {
    return buildChatModel(modelId, fallback);
  }

  console.info(
    "[openrouter] paid credits exhausted, using free fallback instead of",
    modelId
  );
  return buildChatModel(fallback);
}

/** Fast model for voice acks — same credit/fallback logic as agent chat. */
export async function resolveFastChatModel(): Promise<LanguageModel> {
  const { fast, fallback } = openRouterModels;

  if (!isFallbackEnabled()) {
    return buildChatModel(fast);
  }

  if (await hasPaidCreditsRemaining()) {
    return buildChatModel(fast, fallback);
  }

  return buildChatModel(fallback);
}
