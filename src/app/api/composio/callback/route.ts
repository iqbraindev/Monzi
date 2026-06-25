import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const toolkit =
    req.nextUrl.searchParams.get("toolkit") ??
    req.nextUrl.searchParams.get("toolkit_slug") ??
    req.nextUrl.searchParams.get("app");

  const redirectTo = new URL("/integrations", req.url);
  if (toolkit) redirectTo.searchParams.set("connected", toolkit);

  return NextResponse.redirect(redirectTo);
}
