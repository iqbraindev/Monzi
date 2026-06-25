import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
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
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPublicRoute(req)) return NextResponse.next();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const publicMetadata = sessionClaims?.publicMetadata as
    | { role?: string; plan_status?: string }
    | undefined;
  const role = publicMetadata?.role;
  const planStatus = publicMetadata?.plan_status;

  if (isAdminRoute(req) && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (role === "subaccount" && isSubaccountBlocked(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
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
