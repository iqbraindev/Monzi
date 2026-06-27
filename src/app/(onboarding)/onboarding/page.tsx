import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getClerkUserRole } from "@/lib/auth/super-admin";
import { getOnboardingState } from "@/lib/onboarding/service";
import { ensureSupabaseUser } from "@/lib/users/provision";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const role = await getClerkUserRole(userId);
  if (role === "super_admin") redirect("/admin");

  await ensureSupabaseUser(userId);
  const state = await getOnboardingState(userId);
  if (!state) redirect("/sign-in");
  if (state.completed) redirect("/dashboard");

  return <OnboardingWizard initialState={state} />;
}
