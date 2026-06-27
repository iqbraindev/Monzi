import { clerkClient } from "@clerk/nextjs/server";

import type { OnboardingMetadata, OnboardingState, OnboardingStep } from "@/lib/onboarding/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getDefaultWorkspaceForUser } from "@/lib/workspaces/service";

const VALID_STEPS: OnboardingStep[] = [
  "workspace",
  "agent",
  "dashboard",
  "chat",
];

function parseMetadata(raw: unknown): OnboardingMetadata {
  if (!raw || typeof raw !== "object") return {};
  return raw as OnboardingMetadata;
}

function inferStep(
  metadata: OnboardingMetadata,
  hasAgent: boolean,
  hasDashboard: boolean
): OnboardingStep {
  if (metadata.onboarding_step && VALID_STEPS.includes(metadata.onboarding_step)) {
    return metadata.onboarding_step;
  }
  if (!hasAgent) return "agent";
  if (!hasDashboard) return "dashboard";
  return "chat";
}

export async function getOnboardingState(
  userId: string
): Promise<OnboardingState | null> {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("onboarding_completed, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  const workspace = await getDefaultWorkspaceForUser(userId);
  if (!workspace) return null;

  const metadata = parseMetadata(user.metadata);

  const { count: agentCount } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  const { count: dashboardCount } = await supabase
    .from("dashboards")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  const hasAgent = (agentCount ?? 0) > 0;
  const hasDashboard = (dashboardCount ?? 0) > 0;

  let agentId = metadata.onboarding_agent_id;
  if (!agentId && hasAgent) {
    const { data: defaultAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("is_default", true)
      .maybeSingle();
    agentId = defaultAgent?.id ?? undefined;
    if (!agentId) {
      const { data: firstAgent } = await supabase
        .from("agents")
        .select("id")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      agentId = firstAgent?.id ?? undefined;
    }
  }

  let dashboardId = metadata.onboarding_dashboard_id;
  if (!dashboardId && hasDashboard) {
    const { data: defaultDashboard } = await supabase
      .from("dashboards")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("is_default", true)
      .maybeSingle();
    dashboardId = defaultDashboard?.id ?? undefined;
  }

  const completed = user.onboarding_completed === true;
  const step = completed
    ? "chat"
    : inferStep(metadata, hasAgent, hasDashboard);

  return {
    completed,
    step,
    workspaceId: workspace.id,
    agentId,
    dashboardId,
    role: metadata.onboarding_role,
  };
}

export async function updateOnboardingProgress(
  userId: string,
  patch: {
    step?: OnboardingStep;
    agentId?: string;
    dashboardId?: string;
    role?: string;
  }
): Promise<OnboardingState> {
  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();

  if (!user) throw new Error("User not found");

  const metadata = parseMetadata(user.metadata);
  const next: OnboardingMetadata = { ...metadata };

  if (patch.step) next.onboarding_step = patch.step;
  if (patch.agentId) next.onboarding_agent_id = patch.agentId;
  if (patch.dashboardId) next.onboarding_dashboard_id = patch.dashboardId;
  if (patch.role) next.onboarding_role = patch.role;

  const { error } = await supabase
    .from("users")
    .update({ metadata: next, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const state = await getOnboardingState(userId);
  if (!state) throw new Error("Failed to load onboarding state");
  return state;
}

export async function completeOnboarding(
  userId: string
): Promise<{ redirect: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("users")
    .update({
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      onboarding_completed: true,
    },
  });

  return { redirect: "/dashboard" };
}

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  return user?.onboarding_completed === true;
}
