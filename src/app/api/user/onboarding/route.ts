import { auth } from "@clerk/nextjs/server";

import type { OnboardingStep } from "@/lib/onboarding/types";
import {
  completeOnboarding,
  getOnboardingState,
  updateOnboardingProgress,
} from "@/lib/onboarding/service";
import { ensureSupabaseUser } from "@/lib/users/provision";

const VALID_STEPS: OnboardingStep[] = [
  "workspace",
  "agent",
  "dashboard",
  "chat",
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const state = await getOnboardingState(userId);
    if (!state) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load onboarding state";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    step?: OnboardingStep;
    agentId?: string;
    dashboardId?: string;
    role?: string;
    completed?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await ensureSupabaseUser(userId);

    if (body.completed === true) {
      const result = await completeOnboarding(userId);
      return Response.json(result);
    }

    if (body.step && !VALID_STEPS.includes(body.step)) {
      return Response.json({ error: "Invalid step" }, { status: 400 });
    }

    const state = await updateOnboardingProgress(userId, {
      step: body.step,
      agentId: body.agentId,
      dashboardId: body.dashboardId,
      role: body.role,
    });

    return Response.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update onboarding";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSupabaseUser(userId);
    const result = await completeOnboarding(userId);
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete onboarding";
    return Response.json({ error: message }, { status: 500 });
  }
}
