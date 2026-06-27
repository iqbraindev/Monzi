"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AgentBuilderPreview } from "@/components/aria/agents/builder/agent-builder-preview";
import { AgentBuilderStepNav } from "@/components/aria/agents/builder/agent-builder-step-nav";
import {
  BuilderFooter,
} from "@/components/aria/agents/builder/agent-builder-shell";
import {
  IdentityFields,
  RoleFields,
} from "@/components/aria/agents/builder/fields/role-identity-fields";
import { AppConnectPanel } from "@/components/aria/integrations/app-connect-panel";
import {
  clearAgentDraft,
  useAgentBuilderForm,
} from "@/hooks/use-agent-builder-form";
import { createAgent, useInvalidateAgents } from "@/hooks/use-agents";
import { useComposioConnections } from "@/hooks/use-composio-connections";
import { useLimits } from "@/hooks/use-workspaces";
import {
  ONBOARDING_AGENT_STEPS,
  type WizardStep,
} from "@/lib/agents/form-types";

interface AgentStepProps {
  onComplete: (agentId: string, role: string) => void;
}

export function AgentStep({ onComplete }: AgentStepProps) {
  const searchParams = useSearchParams();
  const invalidateAgents = useInvalidateAgents();
  const { data: limitsData } = useLimits();
  const { data: connections = [] } = useComposioConnections();
  const connectedList = useMemo(
    () => connections.map((c) => c.toolkit),
    [connections]
  );

  const {
    draft,
    updateDraft,
    setBuilderPath,
    applyRolePreset,
    toggleComposioApp,
    setComposioApps,
    validateStep,
    goToStep,
    setDraft,
  } = useAgentBuilderForm();

  const [subStep, setSubStep] = useState<WizardStep>("role");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    goToStep("role");
    setSubStep("role");
  }, [goToStep]);

  const handleToggleApp = useCallback(
    (slug: string, enabled: boolean) => {
      toggleComposioApp(slug, enabled, connectedList);
    },
    [toggleComposioApp, connectedList]
  );

  useEffect(() => {
    const slug = searchParams.get("connected");
    if (!slug || !connectedList.includes(slug)) return;
    handleToggleApp(slug, true);
    setSubStep("apps");
    goToStep("apps");
  }, [searchParams, handleToggleApp, goToStep, connectedList]);

  const maxIntegrations = limitsData?.limits?.max_integrations ?? 1;
  const integrationNote =
    maxIntegrations === 1
      ? "Your plan includes 1 app connection — pick the one you use most."
      : undefined;

  const subStepIdx = ONBOARDING_AGENT_STEPS.indexOf(subStep);

  const handleContinue = async () => {
    setError("");
    const err = validateStep(subStep);
    if (err) {
      setError(err);
      return;
    }

    if (subStep === "apps") {
      await handleCreate();
      return;
    }

    const idx = ONBOARDING_AGENT_STEPS.indexOf(subStep);
    if (idx < ONBOARDING_AGENT_STEPS.length - 1) {
      const next = ONBOARDING_AGENT_STEPS[idx + 1];
      setSubStep(next);
      goToStep(next);
    }
  };

  const handleCreate = async () => {
    const nameErr = validateStep("identity");
    if (nameErr) {
      setError(nameErr);
      setSubStep("identity");
      goToStep("identity");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const agent = await createAgent({ ...draft, is_default: true });
      clearAgentDraft();
      invalidateAgents();

      for (const toolkit of draft.tools.composio_apps) {
        await fetch("/api/composio/sync-agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit, agentIds: [agent.id] }),
        });
      }

      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "dashboard",
          agentId: agent.id,
          role: draft.role,
        }),
      });

      onComplete(agent.id, draft.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (subStepIdx > 0) {
      const prev = ONBOARDING_AGENT_STEPS[subStepIdx - 1];
      setSubStep(prev);
      goToStep(prev);
    }
  };

  const stepContent: Record<string, React.ReactNode> = {
    role: (
      <RoleFields
        draft={draft}
        connectedSlugs={connectedList}
        onBuilderPathChange={setBuilderPath}
        onRoleChange={applyRolePreset}
        onDescriptionChange={(description) => updateDraft({ description })}
      />
    ),
    identity: (
      <IdentityFields draft={draft} onChange={updateDraft} />
    ),
    apps: (
      <div className="space-y-3">
        {integrationNote && (
          <p className="rounded-xl border border-aria-primary/20 bg-aria-primary/10 px-4 py-3 text-sm text-aria-primary-light">
            {integrationNote}
          </p>
        )}
        <AppConnectPanel
          draft={draft}
          builderPath={draft.builder_path}
          onToggleApp={handleToggleApp}
          onSetComposioApps={setComposioApps}
          onDraftPersist={() => setDraft({ ...draft })}
        />
      </div>
    ),
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-aria-text">
          Create your first agent
        </h2>
        <p className="mt-2 text-sm text-aria-text-secondary">
          Pick a role, name your agent, and connect the apps it needs.
        </p>
      </div>

      <div className="grid min-h-0 gap-6 lg:grid-cols-[220px_1fr]">
        <div className="hidden lg:block">
          <AgentBuilderPreview draft={draft} connectedSlugs={connectedList} />
        </div>
        <div className="flex min-h-0 flex-col">
          <AgentBuilderStepNav
            current={subStep}
            steps={ONBOARDING_AGENT_STEPS}
            onStepClick={(s) => {
              const targetIdx = ONBOARDING_AGENT_STEPS.indexOf(s);
              if (targetIdx <= subStepIdx) {
                setSubStep(s);
                goToStep(s);
              }
            }}
          />
          <div className="mt-4 min-h-[320px]">{stepContent[subStep]}</div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 border-t border-aria-border pt-4">
            <BuilderFooter
              onBack={subStepIdx > 0 ? handleBack : undefined}
              onContinue={() => void handleContinue()}
              continueLabel={
                subStep === "apps" ? "Create agent" : "Continue"
              }
              loading={submitting}
              skipLabel={subStep === "apps" ? "Skip apps for now" : undefined}
              onSkip={
                subStep === "apps"
                  ? () => void handleCreate()
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
