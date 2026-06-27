import type { AgentBuilderDraft, BuilderPath } from "@/lib/agents/form-types";
import { DEFAULT_AGENT_BUILDER_DRAFT } from "@/lib/agents/form-types";
import { getPersonalityTemplate } from "@/lib/agents/personality-templates";

export interface RolePreset {
  label: string;
  value: string;
  color: string;
  emoji: string;
  description: string;
  examplePrompts: string[];
  suggestedInstructions: string;
  personalityPreset: "professional" | "friendly" | "analytical" | "motivating";
  suggestedApps: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    label: "Business Assistant",
    value: "business_assistant",
    color: "#7C3AED",
    emoji: "💼",
    description:
      "Helps with email, calendar, tasks, and day-to-day business operations.",
    examplePrompts: [
      "Summarize my unread emails",
      "What's on my calendar today?",
      "Draft a follow-up to yesterday's meeting",
    ],
    suggestedInstructions:
      "You help manage email, calendar, and tasks. Summarize inboxes clearly, flag urgent items, and draft replies in my tone. Confirm before sending emails or creating calendar events.",
    personalityPreset: "professional",
    suggestedApps: ["gmail", "googlecalendar", "notion"],
  },
  {
    label: "Finance Advisor",
    value: "finance_advisor",
    color: "#06B6D4",
    emoji: "💰",
    description:
      "Tracks revenue, invoices, cash flow, and financial insights.",
    examplePrompts: [
      "Show overdue invoices",
      "Summarize this month's revenue",
      "What are my top expenses?",
    ],
    suggestedInstructions:
      "You focus on financial clarity. Present numbers with context, highlight trends and anomalies, and suggest actionable next steps. Use tables or bullet points for monetary data.",
    personalityPreset: "analytical",
    suggestedApps: ["stripe", "quickbooks"],
  },
  {
    label: "CRM & Clients",
    value: "crm_clients",
    color: "#10B981",
    emoji: "🤝",
    description:
      "Manages contacts, deals, pipeline, and client relationships.",
    examplePrompts: [
      "Show deals closing this week",
      "Who haven't I contacted in 30 days?",
      "Summarize my pipeline",
    ],
    suggestedInstructions:
      "You manage client relationships and sales pipeline. Track deal stages, follow-ups, and contact history. Proactively flag stale deals and suggest outreach priorities.",
    personalityPreset: "professional",
    suggestedApps: ["hubspot", "salesforce"],
  },
  {
    label: "Content Creator",
    value: "content_creator",
    color: "#F59E0B",
    emoji: "✍️",
    description:
      "Drafts posts, emails, copy, and creative content on your behalf.",
    examplePrompts: [
      "Write a LinkedIn post about our launch",
      "Draft a newsletter intro",
      "Suggest 5 blog titles for Q2",
    ],
    suggestedInstructions:
      "You create engaging written content. Match my brand voice, offer multiple variations when useful, and ask clarifying questions about audience and tone before drafting long pieces.",
    personalityPreset: "friendly",
    suggestedApps: ["notion", "twitter"],
  },
  {
    label: "General Assistant",
    value: "general_assistant",
    color: "#6366F1",
    emoji: "✨",
    description:
      "A versatile helper for anything — research, planning, and daily tasks.",
    examplePrompts: [
      "Help me plan my week",
      "Research competitors in my space",
      "Break down this project into steps",
    ],
    suggestedInstructions:
      "You are a versatile assistant. Break complex requests into clear steps, ask follow-up questions when needed, and prioritize practical, actionable answers.",
    personalityPreset: "friendly",
    suggestedApps: ["gmail", "notion", "googlecalendar"],
  },
];

export function getRolePreset(role: string): RolePreset | undefined {
  return ROLE_PRESETS.find((r) => r.value === role);
}

export function createBlankDraft(builderPath?: BuilderPath): AgentBuilderDraft {
  return {
    ...structuredClone(DEFAULT_AGENT_BUILDER_DRAFT),
    role: builderPath === "custom" ? "custom" : "",
    builder_path: builderPath,
  };
}

export function applyRolePresetToDraft(
  draft: AgentBuilderDraft,
  role: string,
  options?: { connectedSlugs?: string[] }
): AgentBuilderDraft {
  const preset = getRolePreset(role);
  if (!preset) return { ...draft, role };

  const personalityTemplate = getPersonalityTemplate(preset.personalityPreset);
  const connectedSuggested = options?.connectedSlugs
    ? preset.suggestedApps.filter((app) => options.connectedSlugs!.includes(app))
    : undefined;

  return {
    ...draft,
    role,
    description: preset.description,
    avatar: {
      ...draft.avatar,
      primary_color: preset.color,
    },
    personality: {
      ...(personalityTemplate
        ? {
            ...draft.personality,
            preset: personalityTemplate.preset,
            tone: personalityTemplate.tone,
            response_style: personalityTemplate.response_style,
          }
        : draft.personality),
      custom_instructions: preset.suggestedInstructions,
    },
    tools: {
      ...draft.tools,
      composio_apps:
        connectedSuggested !== undefined
          ? connectedSuggested
          : draft.tools.composio_apps,
    },
  };
}

/** @deprecated Use createBlankDraft() */
export function createDefaultDraft(): AgentBuilderDraft {
  return createBlankDraft();
}
