import { DEFAULT_LLM_MODEL } from "@/lib/agents/llm-models";
import { DEFAULT_AGENT_VOICE_ID } from "@/lib/voice/voice-options";

export type AgentAvatarStyle = "lottie" | "illustrated" | "minimal";
export type PersonalityPreset =
  | "professional"
  | "friendly"
  | "analytical"
  | "motivating"
  | "custom";
export type ResponseStyle = "brief" | "detailed" | "conversational";
export type VoiceProvider = "openai" | "elevenlabs" | "none";

export interface AgentBuilderAvatar {
  style: AgentAvatarStyle;
  asset_id: string;
  primary_color: string;
  background_color: string;
}

export interface AgentBuilderPersonality {
  preset: PersonalityPreset;
  tone: string;
  language: string;
  response_style: ResponseStyle;
  custom_instructions?: string;
  llm_model?: string;
}

export interface AgentBuilderVoice {
  provider: VoiceProvider;
  voice_id: string;
  speed: number;
  enabled: boolean;
}

export interface AgentBuilderTools {
  composio_apps: string[];
  dashboard_control: boolean;
  web_search: boolean;
  file_access: boolean;
  calculator: boolean;
}

export type BuilderPath = "preset" | "custom";

export interface AgentBuilderDraft {
  name: string;
  role: string;
  description: string;
  builder_path?: BuilderPath;
  avatar: AgentBuilderAvatar;
  personality: AgentBuilderPersonality;
  voice: AgentBuilderVoice;
  tools: AgentBuilderTools;
}

export const DEFAULT_AGENT_BUILDER_DRAFT: AgentBuilderDraft = {
  name: "",
  role: "",
  description: "",
  avatar: {
    style: "lottie",
    asset_id: "avatar-01",
    primary_color: "#6366F1",
    background_color: "#1e1b4b",
  },
  personality: {
    preset: "friendly",
    tone: "warm and helpful",
    language: "en",
    response_style: "conversational",
    custom_instructions: "",
    llm_model: DEFAULT_LLM_MODEL,
  },
  voice: {
    provider: "elevenlabs",
    voice_id: DEFAULT_AGENT_VOICE_ID,
    speed: 1.0,
    enabled: false,
  },
  tools: {
    composio_apps: [],
    dashboard_control: true,
    web_search: true,
    file_access: false,
    calculator: true,
  },
};

export type WizardStep =
  | "role"
  | "identity"
  | "persona"
  | "apps"
  | "voice"
  | "review";

export const WIZARD_STEPS: WizardStep[] = [
  "role",
  "identity",
  "persona",
  "apps",
  "voice",
  "review",
];

export type StudioTab =
  | "role"
  | "identity"
  | "persona"
  | "apps"
  | "voice"
  | "advanced";

export const STUDIO_TABS: { id: StudioTab; label: string }[] = [
  { id: "role", label: "Role" },
  { id: "identity", label: "Identity" },
  { id: "persona", label: "Persona" },
  { id: "apps", label: "Apps" },
  { id: "voice", label: "Voice" },
  { id: "advanced", label: "Advanced" },
];

export const DRAFT_STORAGE_KEY = "monzi-agent-draft-v4";
