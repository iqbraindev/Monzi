"use client";

import { Sparkles, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentBuilderDraft, BuilderPath } from "@/lib/agents/form-types";
import { ROLE_PRESETS } from "@/lib/agents/presets";
import {
  BuilderField,
  builderInputClass,
  builderTextareaClass,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { AvatarPicker } from "@/components/aria/agents/builder/fields/avatar-picker";

interface RoleFieldsProps {
  draft: AgentBuilderDraft;
  connectedSlugs?: string[];
  showPathSelector?: boolean;
  onBuilderPathChange: (path: BuilderPath) => void;
  onRoleChange: (role: string, connectedSlugs?: string[]) => void;
  onDescriptionChange: (description: string) => void;
}

export function RoleFields({
  draft,
  connectedSlugs = [],
  showPathSelector = true,
  onBuilderPathChange,
  onRoleChange,
  onDescriptionChange,
}: RoleFieldsProps) {
  const selected = ROLE_PRESETS.find((r) => r.value === draft.role);
  const path = draft.builder_path;
  const showPresetContent = path === "preset" || (!showPathSelector && !!selected);
  const showCustomContent =
    path === "custom" || (!showPathSelector && !selected && path !== "preset");

  return (
    <div className="flex flex-col gap-3">
      {showPathSelector && (
        <BuilderField label="How do you want to start?">
          <div className="flex rounded-[11px] border border-aria-border bg-aria-surface/40 p-1">
            <PathTab
              active={path === "preset"}
              icon={<Sparkles className="size-3.5 shrink-0" />}
              title="What should this agent do?"
              onClick={() => onBuilderPathChange("preset")}
            />
            <PathTab
              active={path === "custom"}
              icon={<Wrench className="size-3.5 shrink-0" />}
              title="Create from scratch"
              onClick={() => onBuilderPathChange("custom")}
            />
          </div>
        </BuilderField>
      )}

      {showPresetContent && (
        <>
          <BuilderField
            label="Choose a role"
            hint="We'll pre-fill instructions and recommend apps"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {ROLE_PRESETS.map((preset) => {
                const active = draft.role === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onRoleChange(preset.value, connectedSlugs)}
                    title={preset.description}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[11px] border px-2 py-2.5 text-center transition-all",
                      active
                        ? "border-aria-primary/40 bg-aria-primary/10"
                        : "border-aria-border bg-aria-surface/60 hover:border-aria-border"
                    )}
                  >
                    <span className="text-base leading-none">{preset.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight text-aria-text">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selected && (
              <p className="mt-1.5 text-[11px] leading-snug text-aria-text-secondary">
                {selected.description}
              </p>
            )}
          </BuilderField>

          {selected && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {selected.examplePrompts.length > 0 && (
                <BuilderField
                  label="Example prompts"
                  hint="Things you might ask"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {selected.examplePrompts.map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-aria-border bg-aria-surface/50 px-2.5 py-1 text-[10px] leading-snug text-aria-text-secondary"
                      >
                        &ldquo;{prompt}&rdquo;
                      </span>
                    ))}
                  </div>
                </BuilderField>
              )}

              <BuilderField
                label="Suggested instructions"
                hint="Editable on Persona step"
              >
                <p className="line-clamp-3 rounded-[9px] border border-aria-border bg-aria-surface/50 px-2.5 py-2 text-[10px] leading-relaxed text-aria-text-secondary">
                  {selected.suggestedInstructions}
                </p>
              </BuilderField>
            </div>
          )}

          <BuilderField
            label="Description"
            hint="Optional — shown in preview"
          >
            <input
              type="text"
              value={draft.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="What makes this agent unique?"
              className={builderInputClass}
            />
          </BuilderField>
        </>
      )}

      {showCustomContent && (
        <>
          <BuilderField
            label="What should this agent do?"
            hint="Becomes part of the agent's system prompt"
          >
            <textarea
              autoFocus={showPathSelector}
              value={draft.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="e.g. Help me manage client projects, track deadlines, and draft status updates..."
              className={cn(builderTextareaClass, "min-h-[88px]")}
            />
          </BuilderField>

          {showPathSelector && (
            <p className="text-[11px] text-aria-text-secondary">
              Configure name, appearance, personality, apps, and voice in the
              next steps — nothing is pre-selected.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PathTab({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 py-2 text-[11px] font-semibold transition-all sm:px-3",
        active
          ? "bg-aria-primary/15 text-aria-text shadow-sm"
          : "text-aria-text-secondary hover:text-aria-text"
      )}
    >
      {icon}
      <span className="truncate">{title}</span>
    </button>
  );
}

interface IdentityFieldsProps {
  draft: AgentBuilderDraft;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
}

export function IdentityFields({ draft, onChange }: IdentityFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <BuilderField label="Agent name">
        <input
          autoFocus
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Nova, Max, Ivy"
          className={builderInputClass}
        />
      </BuilderField>

      <AvatarPicker draft={draft} onChange={onChange} />
    </div>
  );
}
