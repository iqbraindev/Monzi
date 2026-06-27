"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { AgentBuilderPreview } from "@/components/aria/agents/builder/agent-builder-preview";
import { AgentBuilderTabNav } from "@/components/aria/agents/builder/agent-builder-tab-nav";
import {
  AgentBuilderShell,
  BuilderFooter,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { RoleFields } from "@/components/aria/agents/builder/fields/role-identity-fields";
import { IdentityFields } from "@/components/aria/agents/builder/fields/role-identity-fields";
import {
  PersonaFields,
  ToolsTogglesFields,
} from "@/components/aria/agents/builder/fields/persona-fields";
import { VoiceFields } from "@/components/aria/agents/builder/fields/voice-review-fields";
import { AppConnectPanel } from "@/components/aria/integrations/app-connect-panel";
import {
  dbAgentToDraft,
  useAgentBuilderForm,
} from "@/hooks/use-agent-builder-form";
import {
  deleteAgent,
  updateAgent,
  useAgent,
  useInvalidateAgents,
  useRemoveAgentFromCache,
} from "@/hooks/use-agents";
import { useComposioConnections } from "@/hooks/use-composio-connections";
import type { StudioTab } from "@/lib/agents/form-types";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AgentBuilderStudioProps {
  agentId: string;
  voiceAllowed?: boolean;
}

export function AgentBuilderStudio({
  agentId,
  voiceAllowed = true,
}: AgentBuilderStudioProps) {
  const router = useRouter();
  const invalidateAgents = useInvalidateAgents();
  const removeAgentFromCache = useRemoveAgentFromCache();
  const { data, isLoading, error: loadError } = useAgent(agentId);
  const {
    draft,
    updateDraft,
    applyRolePreset,
    applyPersonalityPreset,
    toggleComposioApp,
    setComposioApps,
    setDraft,
  } = useAgentBuilderForm({ persist: false });

  const { data: connections = [] } = useComposioConnections();
  const connectedList = useMemo(
    () => connections.map((c) => c.toolkit),
    [connections]
  );

  const handleToggleApp = useCallback(
    (slug: string, enabled: boolean) => {
      toggleComposioApp(slug, enabled, connectedList);
    },
    [toggleComposioApp, connectedList]
  );

  const [tab, setTab] = useState<StudioTab>("role");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.dbAgent) {
      setDraft(dbAgentToDraft(data.dbAgent));
    }
  }, [data?.dbAgent, setDraft]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError("Agent name is required.");
      setTab("identity");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateAgent(agentId, draft);
      invalidateAgents();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data?.dbAgent || data.dbAgent.is_default || deleting) return;

    const confirmed = window.confirm(
      `Delete "${draft.name || "this agent"}"? All conversations and memories for this agent will be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await deleteAgent(agentId);
      removeAgentFromCache(agentId);
      router.push("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-aria-text-muted">
        Loading agent settings…
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
        <p className="text-sm text-aria-danger">
          {loadError instanceof Error ? loadError.message : "Agent not found"}
        </p>
        <Link href="/agents" className="text-sm text-aria-primary-light underline">
          Back to agents
        </Link>
      </div>
    );
  }

  const tabContent: Record<StudioTab, React.ReactNode> = {
    role: (
      <RoleFields
        draft={draft}
        connectedSlugs={connectedList}
        showPathSelector={false}
        onBuilderPathChange={() => undefined}
        onRoleChange={applyRolePreset}
        onDescriptionChange={(description) => updateDraft({ description })}
      />
    ),
    identity: <IdentityFields draft={draft} onChange={updateDraft} />,
    persona: (
      <PersonaFields
        draft={draft}
        onPersonalityPreset={applyPersonalityPreset}
        onChange={updateDraft}
      />
    ),
    apps: (
      <AppConnectPanel
        draft={draft}
        builderPath={draft.builder_path}
        agentId={agentId}
        onToggleApp={handleToggleApp}
        onSetComposioApps={setComposioApps}
      />
    ),
    voice: (
      <VoiceFields
        draft={draft}
        voiceAllowed={voiceAllowed}
        onChange={updateDraft}
      />
    ),
    advanced: <ToolsTogglesFields draft={draft} onChange={updateDraft} />,
  };

  return (
    <AgentBuilderShell
      title={`${draft.name || "Agent"} settings`}
      subtitle="Customize how this agent looks, thinks, and works."
      backHref={`/agents/${agentId}`}
      preview={
        <AgentBuilderPreview draft={draft} connectedSlugs={connectedList} />
      }
      footer={
        <BuilderFooter
          onContinue={handleSave}
          continueLabel="Save changes"
          loading={saving}
        />
      }
    >
      <AgentBuilderTabNav current={tab} onChange={setTab} />
      {tabContent[tab]}
      {saved && (
        <p className="mt-4 text-sm text-aria-success">Settings saved.</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-aria-danger">{error}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-aria-border pt-4">
        <button
          type="button"
          onClick={() => router.push(`/agents/${agentId}`)}
          className="text-sm text-aria-text-secondary underline hover:text-aria-text"
        >
          Back to chat
        </button>
        {!data.dbAgent.is_default && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="text-sm font-medium text-aria-danger transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete agent"}
          </button>
        )}
      </div>
    </AgentBuilderShell>
  );
}
