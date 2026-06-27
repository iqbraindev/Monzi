export interface AgentVoiceOption {
  id: string;
  label: string;
  description: string;
  accent?: string;
  gender?: string;
  badge?: string;
}

/** Default ElevenLabs voice for new agents (Sarah). */
export const DEFAULT_AGENT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/** Premade ElevenLabs voices — used when the voices API is unavailable. */
export const FALLBACK_VOICE_OPTIONS: AgentVoiceOption[] = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    label: "Sarah",
    description: "Mature, reassuring, confident",
    accent: "American",
    gender: "female",
    badge: "Popular",
  },
  {
    id: "cjVigY5qzO86Huf0OWal",
    label: "Eric",
    description: "Smooth, trustworthy",
    accent: "American",
    gender: "male",
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    label: "Jessica",
    description: "Playful, bright, warm",
    accent: "American",
    gender: "female",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    label: "George",
    description: "Warm, captivating storyteller",
    accent: "British",
    gender: "male",
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    label: "Charlie",
    description: "Deep, confident, energetic",
    accent: "Australian",
    gender: "male",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    label: "Alice",
    description: "Clear, engaging educator",
    accent: "British",
    gender: "female",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    label: "Matilda",
    description: "Knowledgeable, professional",
    accent: "American",
    gender: "female",
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    label: "Chris",
    description: "Charming, down-to-earth",
    accent: "American",
    gender: "male",
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    label: "Roger",
    description: "Laid-back, casual, resonant",
    accent: "American",
    gender: "male",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    label: "Laura",
    description: "Enthusiastic, quirky attitude",
    accent: "American",
    gender: "female",
  },
  {
    id: "SAz9YHcvj6GT2YYXdXww",
    label: "River",
    description: "Relaxed, neutral, informative",
    accent: "American",
    gender: "neutral",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    label: "Liam",
    description: "Energetic, social media creator",
    accent: "American",
    gender: "male",
  },
  {
    id: "hpp4J3VqNfWAUOO0d1Us",
    label: "Bella",
    description: "Professional, bright, warm",
    accent: "American",
    gender: "female",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    label: "Brian",
    description: "Deep, resonant, comforting",
    accent: "American",
    gender: "male",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    label: "Daniel",
    description: "Steady broadcaster",
    accent: "British",
    gender: "male",
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    label: "Lily",
    description: "Velvety actress",
    accent: "British",
    gender: "female",
  },
  {
    id: "bIHbv24MWmeRgasZH58o",
    label: "Will",
    description: "Relaxed optimist",
    accent: "American",
    gender: "male",
  },
  {
    id: "N2lVS1w4EtoT3dr4eOWO",
    label: "Callum",
    description: "Husky trickster",
    accent: "American",
    gender: "male",
  },
  {
    id: "SOYHLrjzK2X1ezoPC6cr",
    label: "Harry",
    description: "Fierce warrior",
    accent: "American",
    gender: "male",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    label: "Adam",
    description: "Dominant, firm",
    accent: "American",
    gender: "male",
  },
  {
    id: "pqHfZKP75CvOlQylNhV4",
    label: "Bill",
    description: "Wise, mature, balanced",
    accent: "American",
    gender: "male",
  },
  {
    id: "dXtC3XhB9GtPusIpNtQx",
    label: "Hale",
    description: "Smooth, confident, persuasive",
    accent: "American",
    gender: "male",
  },
];

const VOICE_IDS = new Set(FALLBACK_VOICE_OPTIONS.map((v) => v.id));

const LEGACY_OPENAI_VOICE_ALIASES: Record<string, string> = {
  nova: DEFAULT_AGENT_VOICE_ID,
  shimmer: "cgSgspJ2msm6clMCkdW9",
  alloy: "cjVigY5qzO86Huf0OWal",
  echo: "IKne3meq5aSn9XLyUdCD",
  fable: "JBFqnCBsd6RMkjVDRZzb",
  onyx: "nPczCjzI2devNBz1zQrb",
};

function isElevenLabsVoiceId(value: string | undefined): boolean {
  return Boolean(value && /^[A-Za-z0-9]{16,}$/.test(value));
}

export function getVoiceLabel(voiceId: string, options = FALLBACK_VOICE_OPTIONS): string {
  const option = options.find((v) => v.id === voiceId);
  if (option) return option.label;
  if (LEGACY_OPENAI_VOICE_ALIASES[voiceId]) {
    return getVoiceLabel(LEGACY_OPENAI_VOICE_ALIASES[voiceId], options);
  }
  return voiceId.slice(0, 8);
}

export function normalizeAgentVoiceId(voiceId?: string | null): string {
  const trimmed = voiceId?.trim();
  if (!trimmed) return DEFAULT_AGENT_VOICE_ID;
  if (isElevenLabsVoiceId(trimmed)) return trimmed;
  return LEGACY_OPENAI_VOICE_ALIASES[trimmed] ?? DEFAULT_AGENT_VOICE_ID;
}

export function normalizeAgentVoice(voice?: {
  provider?: string;
  voice_id?: string;
  speed?: number;
  enabled?: boolean;
}): {
  provider: "elevenlabs";
  voice_id: string;
  speed: number;
  enabled: boolean;
} {
  const voiceId = normalizeAgentVoiceId(voice?.voice_id);
  return {
    provider: "elevenlabs",
    voice_id: voiceId,
    speed: voice?.speed ?? 1.0,
    enabled: voice?.enabled ?? false,
  };
}

export function isKnownVoiceId(id: string): boolean {
  return VOICE_IDS.has(id) || isElevenLabsVoiceId(id);
}
