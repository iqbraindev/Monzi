"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Volume2 } from "lucide-react";

import type { AgentBuilderDraft } from "@/lib/agents/form-types";
import {
  BuilderField,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { filterComposioAppsForConnected } from "@/lib/composio/filter-apps";
import { getLlmModelLabel } from "@/lib/agents/llm-models";
import { formatEnergyTokens } from "@/lib/billing/energy";
import {
  DEFAULT_AGENT_VOICE_ID,
  FALLBACK_VOICE_OPTIONS,
  getVoiceLabel,
  type AgentVoiceOption,
} from "@/lib/voice/voice-options";
import { cn } from "@/lib/utils";

interface VoiceFieldsProps {
  draft: AgentBuilderDraft;
  voiceAllowed: boolean;
  onChange: (patch: Partial<AgentBuilderDraft>) => void;
}

export function VoiceFields({
  draft,
  voiceAllowed,
  onChange,
}: VoiceFieldsProps) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [voices, setVoices] = useState<AgentVoiceOption[]>(FALLBACK_VOICE_OPTIONS);
  const [voicesLoading, setVoicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/voices");
        if (!res.ok) return;
        const data = (await res.json()) as { voices?: AgentVoiceOption[] };
        if (!cancelled && data.voices?.length) {
          setVoices(data.voices);
        }
      } finally {
        if (!cancelled) setVoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVoiceId =
    draft.voice.voice_id && draft.voice.voice_id.length > 8
      ? draft.voice.voice_id
      : DEFAULT_AGENT_VOICE_ID;

  const playPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hi, I'm ${draft.name.trim() || "your agent"}. How can I help you today?`,
          voice_id: selectedVoiceId,
          provider: "elevenlabs",
          speed: draft.voice.speed,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectVoice = (voice: AgentVoiceOption) => {
    onChange({
      voice: {
        ...draft.voice,
        voice_id: voice.id,
        provider: "elevenlabs",
      },
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {!voiceAllowed && (
        <div className="rounded-[12px] border border-aria-warning/30 bg-aria-warning/10 px-4 py-3 text-sm text-aria-text-secondary">
          Voice mode requires a Starter plan or higher.{" "}
          <Link href="/billing" className="font-semibold text-aria-primary-light underline">
            Upgrade
          </Link>
        </div>
      )}

      <BuilderField label="Enable voice">
        <label className="flex cursor-pointer items-center justify-between rounded-[12px] border border-aria-border bg-aria-surface/50 px-4 py-3">
          <span className="text-sm text-aria-text">
            Allow live voice conversations with this agent
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.voice.enabled}
            disabled={!voiceAllowed}
            onClick={() =>
              voiceAllowed &&
              onChange({
                voice: {
                  ...draft.voice,
                  provider: "elevenlabs",
                  voice_id: selectedVoiceId,
                  enabled: !draft.voice.enabled,
                },
              })
            }
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors disabled:opacity-40",
              draft.voice.enabled ? "bg-aria-primary" : "bg-aria-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
                draft.voice.enabled ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </label>
      </BuilderField>

      <BuilderField
        label="Voice"
        hint="Used for live calls and voice previews — saved on this agent"
      >
        {voicesLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-aria-text-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading voices…
          </div>
        ) : (
          <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {voices.map((voice) => {
              const active = selectedVoiceId === voice.id;
              return (
                <button
                  key={voice.id}
                  type="button"
                  disabled={!voiceAllowed}
                  onClick={() => selectVoice(voice)}
                  className={cn(
                    "flex flex-col gap-1 rounded-[11px] border px-3 py-2.5 text-left transition-all disabled:opacity-40",
                    active
                      ? "border-aria-primary/40 bg-aria-primary/10"
                      : "border-aria-border bg-aria-surface/60 hover:border-aria-border"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-aria-text">
                      {voice.label}
                    </span>
                    {voice.badge && (
                      <span className="rounded-full bg-aria-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-aria-primary-light uppercase">
                        {voice.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-aria-text-muted capitalize">
                    {[voice.accent, voice.gender].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-[11px] leading-snug text-aria-text-secondary">
                    {voice.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </BuilderField>

      <BuilderField label={`Speed (${draft.voice.speed.toFixed(1)}x)`}>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={draft.voice.speed}
          disabled={!voiceAllowed}
          onChange={(e) =>
            onChange({
              voice: { ...draft.voice, speed: parseFloat(e.target.value) },
            })
          }
          className="w-full accent-aria-primary disabled:opacity-40"
        />
      </BuilderField>

      <button
        type="button"
        disabled={!voiceAllowed || previewLoading}
        onClick={() => void playPreview()}
        className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-aria-border bg-aria-elevated px-4 text-[13px] font-semibold text-aria-text-secondary transition-colors hover:text-aria-text disabled:opacity-40"
      >
        {previewLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Volume2 className="size-3.5" />
        )}
        Preview voice
      </button>
    </div>
  );
}

interface ReviewSummaryProps {
  draft: AgentBuilderDraft;
  connectedSlugs?: string[];
}

export function ReviewSummary({ draft, connectedSlugs = [] }: ReviewSummaryProps) {
  const assignedApps =
    connectedSlugs.length > 0
      ? filterComposioAppsForConnected(
          draft.tools.composio_apps,
          connectedSlugs
        )
      : draft.tools.composio_apps;

  const voiceLabel = draft.voice.enabled
    ? getVoiceLabel(draft.voice.voice_id)
    : "Disabled";

  return (
    <div className="flex flex-col gap-4">
      <BuilderField label="Ready to launch?">
        <p className="text-sm text-aria-text-secondary">
          Review your agent configuration. You can always change these settings
          later from the agent&apos;s settings page.
        </p>
      </BuilderField>
      <dl className="flex flex-col gap-2 rounded-[14px] border border-aria-border bg-aria-surface/50 p-4 text-sm">
        <Row label="Name" value={draft.name || "—"} />
        <Row label="Role" value={draft.role.replace(/_/g, " ")} />
        <Row
          label="Model"
          value={getLlmModelLabel(draft.personality.llm_model ?? "")}
        />
        <Row label="Personality" value={draft.personality.preset} />
        <Row
          label="Apps"
          value={
            assignedApps.length
              ? assignedApps.join(", ")
              : "None selected"
          }
        />
        <Row label="Voice" value={voiceLabel} />
        <Row
          label="Energy"
          value={`${formatEnergyTokens(draft.energy_limit_monthly)} / mo`}
        />
        {draft.personality.custom_instructions?.trim() && (
          <Row label="Instructions" value="Custom rules added" />
        )}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-aria-text-muted">{label}</dt>
      <dd className="text-aria-text capitalize">{value}</dd>
    </div>
  );
}
