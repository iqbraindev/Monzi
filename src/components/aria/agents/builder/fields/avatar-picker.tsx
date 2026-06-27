"use client";

import {
  BuilderField,
} from "@/components/aria/agents/builder/agent-builder-shell";
import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import { AgentAvatarFaceImage } from "@/components/aria/agent-avatar";
import { AGENT_AVATAR_PRESETS } from "@/lib/agents/constants";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  draft: AgentBuilderDraft;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
  showAccentColor?: boolean;
}

export function AvatarPicker({
  draft,
  onChange,
  showAccentColor = true,
}: AvatarPickerProps) {
  return (
    <>
      <BuilderField label="Avatar" hint="Choose how your agent looks">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
          {AGENT_AVATAR_PRESETS.map((preset) => {
            const active = draft.avatar.asset_id === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                aria-label={`Avatar ${preset.label}`}
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    avatar: {
                      ...draft.avatar,
                      asset_id: preset.id,
                      style: preset.style,
                    },
                  })
                }
                className={cn(
                  "relative aspect-square overflow-hidden rounded-full border-2 bg-aria-elevated transition-all hover:scale-105",
                  active
                    ? "border-aria-primary ring-2 ring-aria-primary/30 ring-offset-2 ring-offset-aria-elevated"
                    : "border-aria-border hover:border-aria-border"
                )}
              >
                <AgentAvatarFaceImage
                  assetId={preset.id}
                  alt={preset.label}
                  displaySize={72}
                />
              </button>
            );
          })}
        </div>
      </BuilderField>

      {showAccentColor && (
        <BuilderField label="Accent color" hint="Used for borders and highlights">
          <div className="flex flex-wrap gap-2.5">
            {["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#F43F5E", "#6366F1"].map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    onChange({
                      avatar: { ...draft.avatar, primary_color: color },
                    })
                  }
                  aria-label={`Accent color ${color}`}
                  className={cn(
                    "size-9 rounded-full transition-transform hover:scale-105",
                    draft.avatar.primary_color === color &&
                      "ring-2 ring-white ring-offset-2 ring-offset-aria-elevated"
                  )}
                  style={{ background: color }}
                />
              )
            )}
          </div>
        </BuilderField>
      )}
    </>
  );
}
