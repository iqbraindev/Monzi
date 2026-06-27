"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { AgentBuilderPreview } from "@/components/aria/agents/builder/agent-builder-preview";
import {
  AgentBuilderShell,
  BuilderField,
  builderInputClass,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { AvatarPicker } from "@/components/aria/agents/builder/fields/avatar-picker";
import {
  clearAgentDraft,
  useAgentBuilderForm,
} from "@/hooks/use-agent-builder-form";
import {
  createAgent,
  useAgentsMeta,
  useInvalidateAgents,
} from "@/hooks/use-agents";
import { ROLE_PRESETS } from "@/lib/agents/presets";
import { cn } from "@/lib/utils";

export function QuickCreateForm() {
  const router = useRouter();
  const invalidateAgents = useInvalidateAgents();
  const { data: meta } = useAgentsMeta();
  const { draft, updateDraft, applyRolePreset } = useAgentBuilderForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const limitBadge =
    meta && meta.limit >= 0
      ? `${meta.count} of ${meta.limit} agents`
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Please enter a name for your agent.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const agent = await createAgent(draft);
      clearAgentDraft();
      invalidateAgents();
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentBuilderShell
      title="Quick create"
      subtitle="Name, role, and avatar — customize everything else later."
      limitBadge={limitBadge}
      preview={<AgentBuilderPreview draft={draft} />}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
        <BuilderField label="Agent name">
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="e.g. Nova, Max, Ivy"
            className={builderInputClass}
          />
        </BuilderField>

        <BuilderField label="Role">
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((preset) => {
              const selected = draft.role === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyRolePreset(preset.value)}
                  className={cn(
                    "inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-all",
                    selected
                      ? "border-aria-primary/40 bg-aria-primary/15 text-aria-text"
                      : "border-aria-border bg-[#16161f] text-aria-text-secondary"
                  )}
                >
                  {preset.emoji} {preset.label}
                </button>
              );
            })}
          </div>
        </BuilderField>

        <AvatarPicker
          draft={draft}
          onChange={updateDraft}
          showAccentColor={false}
        />

        {error && <p className="text-sm text-aria-danger">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="aria-gradient flex h-10 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create agent
          </button>
          <Link
            href="/agents/new"
            className="text-sm text-aria-primary-light underline"
          >
            Customize further
          </Link>
        </div>
      </form>
    </AgentBuilderShell>
  );
}
