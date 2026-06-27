import type { Agent, AgentVoice, AppGlyph } from "@/lib/aria/types";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import { normalizeAgentVoice } from "@/lib/voice/voice-options";

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
    style?: string;
    asset_id?: string;
    primary_color?: string;
    background_color?: string;
    custom_image_url?: string;
  };
  personality?: {
    preset?: string;
    tone?: string;
    language?: string;
    response_style?: string;
    custom_instructions?: string;
    llm_model?: string;
  };
  tools: {
    composio_apps?: string[];
    dashboard_control?: boolean;
    web_search?: boolean;
    file_access?: boolean;
    calculator?: boolean;
  };
  voice?: DbAgentVoice;
  energy_limit_monthly?: number;
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
        fg: catalog.fg,
        name: catalog.name,
        toolkitSlug: slug,
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
  return normalizeAgentVoice(voice);
}

export function dbAgentToUiAgent(
  agent: DbAgent,
  conversationCount = 0,
  extraToolkits: string[] = [],
  voiceAllowed = true
): Agent {
  const agentApps = agent.tools?.composio_apps ?? [];
  const composioApps =
    extraToolkits.length > 0
      ? filterComposioAppsForConnected(agentApps, extraToolkits)
      : agentApps;
  const color = agent.avatar?.primary_color ?? "#7C3AED";

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role.replace(/_/g, " "),
    color,
    avatarAssetId: agent.avatar?.asset_id,
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
    isDefault: agent.is_default,
  };
}
