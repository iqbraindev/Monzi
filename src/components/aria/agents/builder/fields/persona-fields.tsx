"use client";

import { cn } from "@/lib/utils";
import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import { DEFAULT_LLM_MODEL } from "@/lib/agents/llm-models";
import { PERSONALITY_TEMPLATES } from "@/lib/agents/personality-templates";
import {
  LANGUAGE_OPTIONS,
} from "@/lib/agents/constants";
import {
  BuilderField,
  builderTextareaClass,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { LlmModelFields } from "@/components/aria/agents/builder/fields/llm-model-fields";

interface PersonaFieldsProps {
  draft: AgentBuilderDraft;
  builderPath?: AgentBuilderDraft["builder_path"];
  onPersonalityPreset: (preset: AgentBuilderDraft["personality"]["preset"]) => void;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
}

export function PersonaFields({
  draft,
  builderPath,
  onPersonalityPreset,
  onChange,
}: PersonaFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <LlmModelFields
        value={draft.personality.llm_model ?? DEFAULT_LLM_MODEL}
        onChange={(llm_model) =>
          onChange({
            personality: { ...draft.personality, llm_model },
          })
        }
      />

      <BuilderField label="Personality">
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TEMPLATES.map((template) => {
            const active = draft.personality.preset === template.preset;
            return (
              <button
                key={template.preset}
                type="button"
                onClick={() => onPersonalityPreset(template.preset)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-[12px] border px-3.5 py-2.5 text-left transition-all",
                  active
                    ? "border-aria-primary/40 bg-aria-primary/15"
                    : "border-aria-border bg-[#16161f] hover:border-aria-border"
                )}
              >
                <span className="text-[13px] font-semibold text-aria-text">
                  {template.label}
                </span>
                <span className="text-[11px] text-aria-text-secondary">
                  {template.description}
                </span>
              </button>
            );
          })}
        </div>
      </BuilderField>

      <BuilderField label="Response style">
        <div className="flex flex-wrap gap-2">
          {(["brief", "conversational", "detailed"] as const).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() =>
                onChange({
                  personality: { ...draft.personality, response_style: style },
                })
              }
              className={cn(
                "h-[34px] rounded-full border px-3.5 text-[13px] font-medium capitalize transition-all",
                draft.personality.response_style === style
                  ? "border-aria-primary/40 bg-aria-primary/15 text-aria-text"
                  : "border-aria-border bg-[#16161f] text-aria-text-secondary"
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </BuilderField>

      <BuilderField label="Language">
        <select
          value={draft.personality.language}
          onChange={(e) =>
            onChange({
              personality: { ...draft.personality, language: e.target.value },
            })
          }
          className="h-[42px] w-full rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none focus:border-aria-primary"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </BuilderField>

      <BuilderField
        label="Custom instructions"
        hint={
          builderPath === "preset"
            ? "Suggested instructions from your role template — edit as needed"
            : "Private rules that shape how this agent behaves in every conversation"
        }
      >
        <textarea
          value={draft.personality.custom_instructions ?? ""}
          onChange={(e) =>
            onChange({
              personality: {
                ...draft.personality,
                custom_instructions: e.target.value,
              },
            })
          }
          placeholder="e.g. Always address me by first name. Never use jargon. Focus on actionable next steps."
          className={cn(builderTextareaClass, "min-h-[120px]")}
        />
      </BuilderField>
    </div>
  );
}

interface ToolsTogglesFieldsProps {
  draft: AgentBuilderDraft;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
}

export function ToolsTogglesFields({ draft, onChange }: ToolsTogglesFieldsProps) {
  const toggles = [
    { key: "dashboard_control" as const, label: "Dashboard control", desc: "Create and modify dashboard widgets" },
    { key: "web_search" as const, label: "Web search", desc: "Search the web for up-to-date information" },
    { key: "calculator" as const, label: "Calculator", desc: "Perform calculations" },
    { key: "file_access" as const, label: "File access", desc: "Read uploaded files (when available)" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {toggles.map(({ key, label, desc }) => (
        <label
          key={key}
          className="flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-aria-border bg-aria-surface/50 px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-aria-text">{label}</span>
            <span className="text-xs text-aria-text-secondary">{desc}</span>
          </span>
          <input
            type="checkbox"
            checked={draft.tools[key]}
            onChange={(e) =>
              onChange({
                tools: { ...draft.tools, [key]: e.target.checked },
              })
            }
            className="size-4 accent-aria-primary"
          />
        </label>
      ))}
    </div>
  );
}
