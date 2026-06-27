export type LlmModelTier = "recommended" | "free";

export interface LlmModelOption {
  id: string;
  label: string;
  provider: string;
  description: string;
  tier: LlmModelTier;
  badge?: string;
}

/** Curated OpenRouter models — popular paid + verified free tiers. */
export const LLM_MODEL_OPTIONS: LlmModelOption[] = [
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    description: "Best all-round quality for complex tasks and tools.",
    tier: "recommended",
    badge: "Most popular",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and affordable — great default for everyday agents.",
    tier: "recommended",
    badge: "Best value",
  },
  {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Strong reasoning, writing, and instruction following.",
    tier: "recommended",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Very fast multimodal model with solid tool use.",
    tier: "recommended",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    label: "DeepSeek V3",
    provider: "DeepSeek",
    description: "High capability at lower cost for coding and analysis.",
    tier: "recommended",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "Meta",
    description: "Open-weight model — strong open-source performance.",
    tier: "recommended",
  },
  {
    id: "cohere/north-mini-code:free",
    label: "North Mini Code",
    provider: "Cohere",
    description: "Free tier — good when credits are low. Coding-focused.",
    tier: "free",
    badge: "Free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    provider: "Meta",
    description: "Free tier — strongest open model for general tasks.",
    tier: "free",
    badge: "Best free",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    label: "Llama 3.2 3B",
    provider: "Meta",
    description: "Free tier — lightweight and fast for simple tasks.",
    tier: "free",
    badge: "Free",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
    provider: "Qwen",
    description: "Free tier — balanced quality for general assistance.",
    tier: "free",
    badge: "Free",
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    provider: "OpenAI",
    description: "Free tier — solid reasoning for everyday chat.",
    tier: "free",
    badge: "Free",
  },
];

/** Retired OpenRouter slugs → current replacements (existing agents). */
const DEPRECATED_MODEL_ALIASES: Record<string, string> = {
  "google/gemini-2.5-flash-preview": "google/gemini-2.5-flash",
  "mistralai/mistral-7b-instruct:free": "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free": "qwen/qwen3-next-80b-a3b-instruct:free",
};

export const DEFAULT_FREE_LLM_MODEL =
  process.env.OPENROUTER_MODEL_FALLBACK?.trim() ||
  "cohere/north-mini-code:free";

export const DEFAULT_LLM_MODEL =
  process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const MODEL_IDS = new Set(LLM_MODEL_OPTIONS.map((m) => m.id));

export function isKnownLlmModel(id: string): boolean {
  return MODEL_IDS.has(id);
}

export function isFreeLlmModel(id: string): boolean {
  if (id.endsWith(":free")) return true;
  const option = LLM_MODEL_OPTIONS.find((m) => m.id === id);
  return option?.tier === "free";
}

export function getLlmModelOption(id: string): LlmModelOption | undefined {
  return LLM_MODEL_OPTIONS.find((m) => m.id === id);
}

export function getLlmModelLabel(id: string): string {
  return getLlmModelOption(id)?.label ?? id.split("/").pop()?.replace(/:free$/, "") ?? id;
}

export function normalizeLlmModel(id?: string | null): string {
  const trimmed = id?.trim();
  if (!trimmed) return DEFAULT_LLM_MODEL;

  const aliased = DEPRECATED_MODEL_ALIASES[trimmed];
  if (aliased) return aliased;

  if (isKnownLlmModel(trimmed)) return trimmed;

  // Unknown but looks like a model id — avoid passing retired :free slugs through.
  if (trimmed.endsWith(":free")) return DEFAULT_FREE_LLM_MODEL;
  if (!trimmed.includes(" ")) return trimmed;

  return DEFAULT_LLM_MODEL;
}

export function getAgentLlmModel(agent: {
  personality?: { llm_model?: string | null } | null;
}): string {
  return normalizeLlmModel(agent.personality?.llm_model);
}
