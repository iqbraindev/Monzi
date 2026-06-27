import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import { DEFAULT_AGENT_BUILDER_DRAFT } from "@/lib/agents/form-types";
import { normalizeLlmModel } from "@/lib/agents/llm-models";
import { normalizeAgentVoice } from "@/lib/voice/voice-options";

/** Legacy quick-create body (name + role + color). */
export interface LegacyCreateAgentBody {
  name?: string;
  role?: string;
  color?: string;
}

export type CreateAgentBody = Partial<AgentBuilderDraft> & LegacyCreateAgentBody;

export function parseCreateAgentBody(body: CreateAgentBody): AgentBuilderDraft {
  const defaults = DEFAULT_AGENT_BUILDER_DRAFT;
  const color = body.color?.trim() || body.avatar?.primary_color || defaults.avatar.primary_color;

  return {
    name: body.name?.trim() ?? "",
    role: body.role?.trim() || "custom",
    description: body.description?.trim() ?? defaults.description,
    avatar: {
      style: body.avatar?.style ?? defaults.avatar.style,
      asset_id: body.avatar?.asset_id ?? defaults.avatar.asset_id,
      primary_color: color,
      background_color:
        body.avatar?.background_color ?? defaults.avatar.background_color,
    },
    personality: {
      preset: body.personality?.preset ?? defaults.personality.preset,
      tone: body.personality?.tone ?? defaults.personality.tone,
      language: body.personality?.language ?? defaults.personality.language,
      response_style:
        body.personality?.response_style ?? defaults.personality.response_style,
      custom_instructions:
        body.personality?.custom_instructions?.trim() ??
        defaults.personality.custom_instructions,
      llm_model: normalizeLlmModel(
        body.personality?.llm_model ?? defaults.personality.llm_model
      ),
    },
    voice: normalizeAgentVoice({
      ...defaults.voice,
      ...body.voice,
    }),
    tools: {
      composio_apps: body.tools?.composio_apps ?? defaults.tools.composio_apps,
      dashboard_control:
        body.tools?.dashboard_control ?? defaults.tools.dashboard_control,
      web_search: body.tools?.web_search ?? defaults.tools.web_search,
      file_access: body.tools?.file_access ?? defaults.tools.file_access,
      calculator: body.tools?.calculator ?? defaults.tools.calculator,
    },
    energy_limit_monthly:
      typeof body.energy_limit_monthly === "number"
        ? body.energy_limit_monthly
        : defaults.energy_limit_monthly,
  };
}

export function draftToDbRow(
  draft: AgentBuilderDraft,
  userId: string,
  workspaceId: string,
  slug: string
) {
  return {
    user_id: userId,
    workspace_id: workspaceId,
    name: draft.name,
    slug,
    role: draft.role,
    description: draft.description || null,
    avatar: draft.avatar,
    personality: draft.personality,
    voice: normalizeAgentVoice(draft.voice),
    tools: draft.tools,
    energy_limit_monthly: draft.energy_limit_monthly,
    is_default: false,
  };
}

export function draftToDbUpdate(
  draft: PatchAgentBody,
  existing: {
    tools?: AgentBuilderDraft["tools"];
    avatar?: AgentBuilderDraft["avatar"];
    personality?: AgentBuilderDraft["personality"];
    voice?: AgentBuilderDraft["voice"];
  }
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (draft.name !== undefined) update.name = draft.name.trim();
  if (draft.role !== undefined) update.role = draft.role;
  if (draft.description !== undefined) {
    update.description = draft.description.trim() || null;
  }
  if (typeof draft.is_active === "boolean") update.is_active = draft.is_active;
  if (draft.avatar) {
    update.avatar = { ...existing.avatar, ...draft.avatar };
  }
  if (draft.personality) {
    update.personality = { ...existing.personality, ...draft.personality };
  }
  if (draft.voice) {
    update.voice = normalizeAgentVoice({
      ...existing.voice,
      ...draft.voice,
    });
  }
  if (draft.tools) {
    update.tools = { ...(existing.tools ?? {}), ...draft.tools };
  }
  if (draft.composio_apps) {
    update.tools = {
      ...((update.tools as object) ?? existing.tools ?? {}),
      composio_apps: draft.composio_apps,
    };
  }
  if (typeof draft.energy_limit_monthly === "number") {
    update.energy_limit_monthly = draft.energy_limit_monthly;
  }

  return update;
}

// Allow PATCH with composio_apps at top level for backwards compat
export type PatchAgentBody = Partial<AgentBuilderDraft> & {
  composio_apps?: string[];
  is_active?: boolean;
};
