"use client";

import { Suspense, useCallback, useState } from "react";

import { MonziLogo, MONZI_LOGO_APP_STYLE } from "@/components/brand/monzi-logo";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { AgentStep } from "@/components/onboarding/steps/agent-step";
import { ChatStep } from "@/components/onboarding/steps/chat-step";
import { DashboardStep } from "@/components/onboarding/steps/dashboard-step";
import { WorkspaceStep } from "@/components/onboarding/steps/workspace-step";
import { useWorkspaces } from "@/hooks/use-workspaces";
import type { OnboardingState, OnboardingStep } from "@/lib/onboarding/types";

interface OnboardingWizardProps {
  initialState: OnboardingState;
}

export function OnboardingWizard({ initialState }: OnboardingWizardProps) {
  const { data: workspacesData } = useWorkspaces();
  const workspace = workspacesData?.workspaces.find(
    (w) => w.id === initialState.workspaceId
  );

  const [step, setStep] = useState<OnboardingStep>(initialState.step);
  const [agentId, setAgentId] = useState(initialState.agentId ?? "");
  const [role, setRole] = useState(initialState.role ?? "");

  const goToAgent = useCallback(() => setStep("agent"), []);
  const goToChat = useCallback(() => setStep("chat"), []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-aria-border bg-aria-surface/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <MonziLogo href="/dashboard" style={MONZI_LOGO_APP_STYLE} />
          <span className="text-xs text-aria-text-muted">Getting started</span>
        </div>
      </header>

      <OnboardingProgress current={step} />

      <main className="flex flex-1 flex-col px-6 pb-12 pt-2">
        {step === "workspace" && (
          <WorkspaceStep
            workspaceId={initialState.workspaceId}
            initialName={workspace?.name}
            initialDescription={workspace?.description ?? ""}
            initialActivityDomain={workspace?.activity_domain}
            onComplete={goToAgent}
          />
        )}

        {step === "agent" && (
          <Suspense
            fallback={
              <div className="py-20 text-center text-sm text-aria-text-muted">
                Loading…
              </div>
            }
          >
            <AgentStep
              onComplete={(id, agentRole) => {
                setAgentId(id);
                setRole(agentRole);
                setStep("dashboard");
              }}
            />
          </Suspense>
        )}

        {step === "dashboard" && agentId && (
          <DashboardStep agentId={agentId} onComplete={goToChat} />
        )}

        {step === "chat" && agentId && (
          <ChatStep agentId={agentId} role={role} />
        )}
      </main>
    </div>
  );
}
