import type {
  PersonalityPreset,
  ResponseStyle,
} from "@/lib/agents/form-types";

export interface PersonalityTemplate {
  preset: PersonalityPreset;
  label: string;
  tone: string;
  response_style: ResponseStyle;
  description: string;
}

export const PERSONALITY_TEMPLATES: PersonalityTemplate[] = [
  {
    preset: "professional",
    label: "Professional",
    tone: "formal, concise, action-oriented",
    response_style: "brief",
    description: "Direct and structured. Uses bullet points when helpful.",
  },
  {
    preset: "friendly",
    label: "Friendly",
    tone: "warm, encouraging, conversational",
    response_style: "conversational",
    description: "Natural and approachable. Asks follow-up questions.",
  },
  {
    preset: "analytical",
    label: "Analytical",
    tone: "precise, data-driven, structured",
    response_style: "detailed",
    description: "Presents data clearly with reasoning and numbers.",
  },
  {
    preset: "motivating",
    label: "Motivating",
    tone: "energetic, positive, supportive",
    response_style: "conversational",
    description: "Celebrates wins and keeps momentum high.",
  },
];

export function getPersonalityTemplate(
  preset: PersonalityPreset
): PersonalityTemplate | undefined {
  return PERSONALITY_TEMPLATES.find((t) => t.preset === preset);
}
