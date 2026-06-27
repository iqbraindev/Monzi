import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const toolkit =
    req.nextUrl.searchParams.get("toolkit") ??
    req.nextUrl.searchParams.get("toolkit_slug") ??
    req.nextUrl.searchParams.get("app");

  const returnCookie = req.cookies.get("monzi-oauth-return")?.value;
  const returnPath = returnCookie
    ? decodeURIComponent(returnCookie)
    : "/integrations";

  const redirectTo = new URL(returnPath, req.url);
  if (toolkit) redirectTo.searchParams.set("connected", toolkit);

  const response = NextResponse.redirect(redirectTo);
  response.cookies.delete("monzi-oauth-return");
  return response;
}
