export type OnboardingStep = "workspace" | "agent" | "dashboard" | "chat";

export interface OnboardingMetadata {
  onboarding_step?: OnboardingStep;
  onboarding_agent_id?: string;
  onboarding_dashboard_id?: string;
  onboarding_role?: string;
}

export interface OnboardingState {
  completed: boolean;
  step: OnboardingStep;
  workspaceId: string;
  agentId?: string;
  dashboardId?: string;
  role?: string;
}
