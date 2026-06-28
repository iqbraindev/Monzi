import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getClerkUserRole, resolveEffectiveRole } from "@/lib/auth/super-admin";
import { getRoleFromSessionClaims } from "@/lib/auth/session-claims";
import { isOnboardingCompleted } from "@/lib/onboarding/service";

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isUserAppRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/agents(.*)",
  "/integrations(.*)",
  "/subaccounts(.*)",
  "/billing",
  "/billing/(.*)",
  "/settings(.*)",
]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isSubaccountBlocked = createRouteMatcher([
  "/billing(.*)",
  "/subaccounts(.*)",
  "/integrations(.*)",
  "/api/admin(.*)",
]);
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/api/composio/callback(.*)",
  "/api/elevenlabs/v1/chat/completions",
  "/api/user/sync-role(.*)",
]);

async function resolveOnboardingCompleted(
  userId: string,
  sessionClaims: Record<string, unknown> | null | undefined
): Promise<boolean> {
  const publicMetadata = sessionClaims?.publicMetadata as
    | { onboarding_completed?: boolean }
    | undefined;

  if (publicMetadata?.onboarding_completed === true) return true;
  if (publicMetadata?.onboarding_completed === false) return false;

  return isOnboardingCompleted(userId);
}

async function defaultDestination(
  userId: string,
  role: string,
  sessionClaims: Record<string, unknown> | null | undefined
): Promise<string> {
  if (role === "super_admin") return "/admin";
  const completed = await resolveOnboardingCompleted(userId, sessionClaims);
  return completed ? "/dashboard" : "/onboarding";
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  const publicMetadata = sessionClaims?.publicMetadata as
    | { role?: string; plan_status?: string; onboarding_completed?: boolean }
    | undefined;
  const jwtRole =
    getRoleFromSessionClaims(sessionClaims) ?? publicMetadata?.role;
  let role = resolveEffectiveRole(sessionClaims, jwtRole);
  const planStatus = publicMetadata?.plan_status;

  if (isAuthRoute(req) && userId) {
    if (role !== "super_admin") {
      role = await getClerkUserRole(userId);
    }
    const destination = await defaultDestination(userId, role, sessionClaims);
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (isPublicRoute(req)) return NextResponse.next();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isAdminRoute(req) && role !== "super_admin") {
    const clerkRole = await getClerkUserRole(userId);
    if (clerkRole !== "super_admin") {
      const destination = await defaultDestination(
        userId,
        clerkRole,
        sessionClaims
      );
      return NextResponse.redirect(new URL(destination, req.url));
    }
    role = "super_admin";
  }

  if (role === "super_admin" && isUserAppRoute(req)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (role !== "super_admin") {
    const onboardingCompleted = await resolveOnboardingCompleted(
      userId,
      sessionClaims
    );

    if (!onboardingCompleted && isUserAppRoute(req)) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    if (onboardingCompleted && isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (role === "subaccount" && isSubaccountBlocked(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    role !== "super_admin" &&
    planStatus === "past_due" &&
    !req.nextUrl.pathname.startsWith("/billing") &&
    !isOnboardingRoute(req)
  ) {
    return NextResponse.redirect(
      new URL("/billing?status=past_due", req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
