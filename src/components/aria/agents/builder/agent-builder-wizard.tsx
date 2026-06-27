"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AgentBuilderPreview } from "@/components/aria/agents/builder/agent-builder-preview";
import { AgentBuilderStepNav } from "@/components/aria/agents/builder/agent-builder-step-nav";
import {
  AgentBuilderShell,
  BuilderFooter,
} from "@/components/aria/agents/builder/agent-builder-shell";
import { RoleFields } from "@/components/aria/agents/builder/fields/role-identity-fields";
import { IdentityFields } from "@/components/aria/agents/builder/fields/role-identity-fields";
import { PersonaFields } from "@/components/aria/agents/builder/fields/persona-fields";
import {
  ReviewSummary,
  VoiceFields,
} from "@/components/aria/agents/builder/fields/voice-review-fields";
import { AppConnectPanel } from "@/components/aria/integrations/app-connect-panel";
import {
  clearAgentDraft,
  useAgentBuilderForm,
} from "@/hooks/use-agent-builder-form";
import {
  createAgent,
  useAgentsMeta,
  useInvalidateAgents,
} from "@/hooks/use-agents";
import { useComposioConnections } from "@/hooks/use-composio-connections";
import type { WizardStep } from "@/lib/agents/form-types";
import { WIZARD_STEPS } from "@/lib/agents/form-types";

interface AgentBuilderWizardProps {
  voiceAllowed?: boolean;
}

export function AgentBuilderWizard({
  voiceAllowed = true,
}: AgentBuilderWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidateAgents = useInvalidateAgents();
  const { data: meta } = useAgentsMeta();
  const {
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
  } = useAgentBuilderForm();

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

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const slug = searchParams.get("connected");
    if (!slug || !connectedList.includes(slug)) return;
    handleToggleApp(slug, true);
    goToStep("apps");
  }, [searchParams, handleToggleApp, goToStep, connectedList]);

  const limitBadge =
    meta && meta.limit >= 0
      ? `${meta.count} of ${meta.limit} agents`
      : undefined;

  const handleContinue = () => {
    setError("");
    if (step === "review") {
      void handleCreate();
      return;
    }
    const err = nextStep();
    if (err) setError(err);
  };

  const handleCreate = async () => {
    const nameErr = validateStep("identity");
    if (nameErr) {
      setError(nameErr);
      goToStep("identity");
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

  const handleSkip = () => {
    if (step === "apps" || step === "voice") {
      goToStep("review");
    }
  };

  const stepContent: Record<WizardStep, React.ReactNode> = {
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
    persona: (
      <PersonaFields
        draft={draft}
        builderPath={draft.builder_path}
        onPersonalityPreset={applyPersonalityPreset}
        onChange={updateDraft}
      />
    ),
    apps: (
      <AppConnectPanel
        draft={draft}
        builderPath={draft.builder_path}
        onToggleApp={handleToggleApp}
        onSetComposioApps={setComposioApps}
        onDraftPersist={() => undefined}
      />
    ),
    voice: (
      <VoiceFields
        draft={draft}
        voiceAllowed={voiceAllowed}
        onChange={updateDraft}
      />
    ),
    review: (
      <ReviewSummary draft={draft} connectedSlugs={connectedList} />
    ),
  };

  const stepIdx = WIZARD_STEPS.indexOf(step);

  return (
    <AgentBuilderShell
      title="Create a new agent"
      subtitle={
        draft.builder_path === "custom"
          ? "Build your agent step by step — full control."
          : draft.builder_path === "preset"
            ? "Pick a role template — we'll guide you through setup."
            : "Choose a template or start from scratch."
      }
      limitBadge={limitBadge}
      preview={
        <AgentBuilderPreview draft={draft} connectedSlugs={connectedList} />
      }
      footer={
        <BuilderFooter
          onBack={stepIdx > 0 ? prevStep : undefined}
          onContinue={handleContinue}
          continueLabel={step === "review" ? "Create agent & chat" : "Continue"}
          loading={submitting}
          skipLabel={
            step === "apps" || step === "voice"
              ? "Skip setup, I'll do it later"
              : undefined
          }
          onSkip={
            step === "apps" || step === "voice" ? handleSkip : undefined
          }
        />
      }
    >
      <AgentBuilderStepNav
        current={step}
        onStepClick={(s) => {
          const targetIdx = WIZARD_STEPS.indexOf(s);
          if (targetIdx <= stepIdx) goToStep(s);
        }}
      />
      {stepContent[step]}
      {error && (
        <p className="mt-4 text-sm text-aria-danger">{error}</p>
      )}
    </AgentBuilderShell>
  );
}
