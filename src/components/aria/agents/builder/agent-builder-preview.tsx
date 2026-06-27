"use client";

import { Phone, MicOff } from "lucide-react";

import { AgentAvatar } from "@/components/aria/agent-avatar";
import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import { getRolePreset } from "@/lib/agents/presets";
import { getPersonalityTemplate } from "@/lib/agents/personality-templates";
import { getLlmModelLabel } from "@/lib/agents/llm-models";
import { getVoiceLabel } from "@/lib/voice/voice-options";
import { ToolkitLogo } from "@/components/aria/integrations/integration-logo";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { TOOLKIT_CATALOG } from "@/lib/composio/toolkits";
import { cn } from "@/lib/utils";

interface AgentBuilderPreviewProps {
  draft: AgentBuilderDraft;
  connectedSlugs?: string[];
  className?: string;
}

export function AgentBuilderPreview({
  draft,
  connectedSlugs = [],
  className,
}: AgentBuilderPreviewProps) {
  const rolePreset = getRolePreset(draft.role);
  const personalityLabel =
    getPersonalityTemplate(draft.personality.preset)?.label ??
    draft.personality.preset;
  const color = draft.avatar.primary_color;
  const apps = (
    connectedSlugs.length
      ? filterComposioAppsForConnected(
          draft.tools.composio_apps,
          connectedSlugs
        )
      : draft.tools.composio_apps
  ).slice(0, 5);
  const totalApps =
    connectedSlugs.length
      ? filterComposioAppsForConnected(
          draft.tools.composio_apps,
          connectedSlugs
        ).length
      : draft.tools.composio_apps.length;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[16px] border border-aria-border bg-aria-surface/70 px-4 pt-5 pb-4 backdrop-blur-md",
        className
      )}
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div
        className="pointer-events-none absolute -top-[24%] left-1/2 size-40 -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${color}66, transparent 65%)`,
        }}
      />

      <AgentAvatar
        assetId={draft.avatar.asset_id}
        color={color}
        size={64}
        breathe
        className="relative mb-0.5"
        alt={draft.name.trim() || "Agent preview"}
      />

      <h3 className="relative font-heading text-lg font-bold text-aria-text">
        {draft.name.trim() || "Your agent"}
      </h3>

      <span
        className="relative rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ color, background: `${color}28` }}
      >
        {rolePreset?.label ??
          (draft.builder_path === "custom" || draft.role === "custom"
            ? "Custom agent"
            : draft.role
              ? draft.role.replace(/_/g, " ")
              : "Choose a role")}
      </span>

      <span className="relative rounded-full bg-aria-primary/12 px-2.5 py-0.5 text-[11px] font-semibold text-aria-primary-light">
        {personalityLabel}
      </span>

      {draft.personality.llm_model && (
        <span className="relative rounded-full border border-aria-border bg-aria-surface/60 px-2.5 py-0.5 text-[10px] font-medium text-aria-text-secondary">
          {getLlmModelLabel(draft.personality.llm_model)}
        </span>
      )}

      {draft.description && (
        <p className="relative mt-1 text-center text-xs leading-relaxed text-aria-text-secondary">
          {draft.description}
        </p>
      )}

      {apps.length > 0 && (
        <div className="relative mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {apps.map((slug) => {
            const catalog = TOOLKIT_CATALOG[slug];
            if (!catalog) return null;
            return (
              <span key={slug} title={catalog.name}>
                <ToolkitLogo slug={slug} size={26} radius={7} />
              </span>
            );
          })}
          {totalApps > 5 && (
            <span className="text-[11px] text-aria-text-muted">
              +{totalApps - 5}
            </span>
          )}
        </div>
      )}

      {rolePreset && draft.builder_path === "preset" && rolePreset.examplePrompts.length > 0 && (
        <div className="relative mt-2 w-full border-t border-aria-border/60 pt-2">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-aria-text-muted uppercase">
            Try asking
          </p>
          <ul className="flex flex-col gap-0.5">
            {rolePreset.examplePrompts.slice(0, 2).map((prompt) => (
              <li
                key={prompt}
                className="text-[10px] leading-snug text-aria-text-secondary"
              >
                &ldquo;{prompt}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative mt-2 flex items-center gap-1.5 text-[10px] text-aria-text-secondary">
        {draft.voice.enabled ? (
          <>
            <Phone className="size-3 text-aria-primary-light" />
            Voice · {getVoiceLabel(draft.voice.voice_id)}
          </>
        ) : (
          <>
            <MicOff className="size-3" />
            Voice off
          </>
        )}
      </div>
    </div>
  );
}
