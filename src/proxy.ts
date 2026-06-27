import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getClerkUserRole, resolveEffectiveRole } from "@/lib/auth/super-admin";
import { getRoleFromSessionClaims } from "@/lib/auth/session-claims";

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
const isSubaccountBlocked = createRouteMatcher([
  "/billing(.*)",
  "/subaccounts(.*)",
  "/api/admin(.*)",
]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/api/composio/callback(.*)",
  "/api/elevenlabs/v1/chat/completions",
  "/api/user/sync-role(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  const publicMetadata = sessionClaims?.publicMetadata as
    | { role?: string; plan_status?: string }
    | undefined;
  const jwtRole =
    getRoleFromSessionClaims(sessionClaims) ?? publicMetadata?.role;
  let role = resolveEffectiveRole(sessionClaims, jwtRole);
  const planStatus = publicMetadata?.plan_status;

  if (isAuthRoute(req) && userId) {
    if (role !== "super_admin") {
      role = await getClerkUserRole(userId);
    }
    const destination = role === "super_admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (isPublicRoute(req)) return NextResponse.next();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isAdminRoute(req) && role !== "super_admin") {
    const clerkRole = await getClerkUserRole(userId);
    if (clerkRole !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    role = "super_admin";
  }

  if (role === "super_admin" && isUserAppRoute(req)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (role === "subaccount" && isSubaccountBlocked(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    role !== "super_admin" &&
    planStatus === "past_due" &&
    !req.nextUrl.pathname.startsWith("/billing")
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
