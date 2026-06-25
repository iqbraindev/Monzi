import type { Agent, AgentVoice, AppGlyph } from "@/lib/aria/types";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";

export interface DbAgentVoice {
  provider?: "openai" | "elevenlabs" | "none";
  voice_id?: string;
  speed?: number;
  enabled?: boolean;
}

export interface DbAgent {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  role: string;
  description: string | null;
  avatar: {
    primary_color?: string;
  };
  personality?: {
    preset?: string;
    tone?: string;
    language?: string;
    response_style?: string;
  };
  tools: {
    composio_apps?: string[];
    dashboard_control?: boolean;
    web_search?: boolean;
    file_access?: boolean;
    calculator?: boolean;
  };
  voice?: DbAgentVoice;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function toolkitsToGlyphs(toolkits: string[]): AppGlyph[] {
  return toolkits
    .map((slug) => {
      const catalog = TOOLKIT_CATALOG[slug];
      if (!catalog) return null;
      return {
        glyph: catalog.glyph,
        color: catalog.bg,
        name: catalog.name,
      };
    })
    .filter((g): g is AppGlyph => g !== null);
}

function formatLastActive(updatedAt: string): string {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeVoice(voice?: DbAgentVoice): AgentVoice {
  return {
    provider: voice?.provider ?? "openai",
    voice_id: voice?.voice_id ?? "nova",
    speed: voice?.speed ?? 1.0,
    // Enabled for all agents until per-agent voice settings ship (legacy DB default was false).
    enabled: true,
  };
}

export function dbAgentToUiAgent(
  agent: DbAgent,
  conversationCount = 0,
  extraToolkits: string[] = [],
  voiceAllowed = true
): Agent {
  const composioApps = [
    ...new Set([...(agent.tools?.composio_apps ?? []), ...extraToolkits]),
  ];
  const color = agent.avatar?.primary_color ?? "#7C3AED";

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role.replace(/_/g, " "),
    color,
    status: agent.is_active ? "active" : "inactive",
    conversations: conversationCount,
    lastActive: formatLastActive(agent.updated_at),
    apps: toolkitsToGlyphs(composioApps),
    memories: [],
    capabilities: composioApps.length
      ? composioApps.map(
          (slug) =>
            `Use ${TOOLKIT_CATALOG[slug]?.name ?? slug} on your behalf`
        )
      : ["Connect apps in Integrations to unlock capabilities"],
    voice: normalizeVoice(agent.voice),
    voiceAllowed,
  };
}
