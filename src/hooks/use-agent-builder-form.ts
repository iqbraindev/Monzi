"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DRAFT_STORAGE_KEY,
  DEFAULT_AGENT_BUILDER_DRAFT,
  type AgentBuilderDraft,
  type BuilderPath,
  type PersonalityPreset,
  type WizardStep,
  WIZARD_STEPS,
} from "@/lib/agents/form-types";
import { getPersonalityTemplate } from "@/lib/agents/personality-templates";
import type { DbAgent } from "@/lib/agents/adapter";
import { normalizeLlmModel } from "@/lib/agents/llm-models";
import { normalizeAgentVoice } from "@/lib/voice/voice-options";
import {
  applyRolePresetToDraft,
  createBlankDraft,
  getRolePreset,
} from "@/lib/agents/presets";

function loadDraftFromStorage(): AgentBuilderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgentBuilderDraft;
  } catch {
    return null;
  }
}

function saveDraftToStorage(draft: AgentBuilderDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearAgentDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function dbAgentToDraft(agent: DbAgent): AgentBuilderDraft {
  const personality = agent.personality ?? DEFAULT_AGENT_BUILDER_DRAFT.personality;
  const voice = agent.voice ?? DEFAULT_AGENT_BUILDER_DRAFT.voice;
  const tools = agent.tools ?? DEFAULT_AGENT_BUILDER_DRAFT.tools;

  return {
    name: agent.name,
    role: agent.role,
    description: agent.description ?? "",
    builder_path: getRolePreset(agent.role) ? "preset" : "custom",
    avatar: {
      style: (agent.avatar?.style as AgentBuilderDraft["avatar"]["style"]) ?? "lottie",
      asset_id: agent.avatar?.asset_id ?? "avatar-01",
      primary_color: agent.avatar?.primary_color ?? "#6366F1",
      background_color: agent.avatar?.background_color ?? "#1e1b4b",
    },
    personality: {
      preset: (personality.preset as AgentBuilderDraft["personality"]["preset"]) ?? "friendly",
      tone: personality.tone ?? "warm and helpful",
      language: personality.language ?? "en",
      response_style:
        (personality.response_style as AgentBuilderDraft["personality"]["response_style"]) ??
        "conversational",
      custom_instructions:
        (personality as { custom_instructions?: string }).custom_instructions ?? "",
      llm_model: normalizeLlmModel(
        (personality as { llm_model?: string }).llm_model
      ),
    },
    voice: normalizeAgentVoice(voice),
    tools: {
      composio_apps: tools.composio_apps ?? [],
      dashboard_control: tools.dashboard_control ?? true,
      web_search: tools.web_search ?? true,
      file_access: tools.file_access ?? false,
      calculator: tools.calculator ?? true,
    },
    energy_limit_monthly:
      agent.energy_limit_monthly ??
      DEFAULT_AGENT_BUILDER_DRAFT.energy_limit_monthly,
  };
}

export function useAgentBuilderForm(options?: {
  initialDraft?: AgentBuilderDraft;
  persist?: boolean;
}) {
  const persist = options?.persist ?? !options?.initialDraft;
  const [draft, setDraft] = useState<AgentBuilderDraft>(() => {
    if (options?.initialDraft) return options.initialDraft;
    return loadDraftFromStorage() ?? createBlankDraft();
  });
  const [step, setStep] = useState<WizardStep>("role");

  useEffect(() => {
    if (persist) {
      saveDraftToStorage(draft);
    }
  }, [draft, persist]);

  const updateDraft = useCallback(
    (patch: Partial<AgentBuilderDraft> | ((prev: AgentBuilderDraft) => AgentBuilderDraft)) => {
      setDraft((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
      );
    },
    []
  );

  const setBuilderPath = useCallback((path: BuilderPath) => {
    setDraft(createBlankDraft(path));
  }, []);

  const applyRolePreset = useCallback(
    (role: string, connectedSlugs?: string[]) => {
      setDraft((prev) => {
        if (prev.builder_path === "custom") return prev;
        return applyRolePresetToDraft(prev, role, { connectedSlugs });
      });
    },
    []
  );

  const applyPersonalityPreset = useCallback((preset: PersonalityPreset) => {
    const template = getPersonalityTemplate(preset);
    if (!template) return;
    setDraft((prev) => ({
      ...prev,
      personality: {
        ...prev.personality,
        preset: template.preset,
        tone: template.tone,
        response_style: template.response_style,
      },
    }));
  }, []);

  const toggleComposioApp = useCallback(
    (slug: string, enabled: boolean, connectedSlugs?: string[]) => {
      setDraft((prev) => {
        if (enabled && connectedSlugs && !connectedSlugs.includes(slug)) {
          return prev;
        }
        const apps = new Set(prev.tools.composio_apps);
        if (enabled) apps.add(slug);
        else apps.delete(slug);
        return {
          ...prev,
          tools: { ...prev.tools, composio_apps: Array.from(apps) },
        };
      });
    },
    []
  );

  const setComposioApps = useCallback((apps: string[]) => {
    setDraft((prev) => ({
      ...prev,
      tools: { ...prev.tools, composio_apps: apps },
    }));
  }, []);

  const validateStep = useCallback(
    (s: WizardStep): string | null => {
      switch (s) {
        case "role":
          if (!draft.builder_path) {
            return "Choose how you want to create your agent.";
          }
          if (draft.builder_path === "preset" && !getRolePreset(draft.role)) {
            return "Please select a role for your agent.";
          }
          if (draft.builder_path === "custom" && !draft.description.trim()) {
            return "Describe what your agent should do.";
          }
          return null;
        case "identity":
          if (!draft.name.trim()) return "Please enter a name for your agent.";
          return null;
        default:
          return null;
      }
    },
    [draft.builder_path, draft.description, draft.name, draft.role]
  );

  const nextStep = useCallback(() => {
    const err = validateStep(step);
    if (err) return err;
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx < WIZARD_STEPS.length - 1) {
      setStep(WIZARD_STEPS[idx + 1]);
    }
    return null;
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    const idx = WIZARD_STEPS.indexOf(step);
    if (idx > 0) setStep(WIZARD_STEPS[idx - 1]);
  }, [step]);

  const goToStep = useCallback((s: WizardStep) => setStep(s), []);

  const resetDraft = useCallback(() => {
    const fresh = createBlankDraft();
    setDraft(fresh);
    saveDraftToStorage(fresh);
    setStep("role");
  }, []);

  return {
    draft,
    step,
    updateDraft,
    setBuilderPath,
    applyRolePreset,
    applyPersonalityPreset,
    toggleComposioApp,
    setComposioApps,
    validateStep,
    nextStep,
    prevStep,
    goToStep,
    resetDraft,
    setDraft,
  };
}
