import { NextResponse } from "next/server";
import { buildUpstoxAuthorizationUrl } from "../../../../src/integrations/upstox/oauth";
import { createOAuthState } from "../../../../src/integrations/upstox/state";

export const runtime = "nodejs";

export async function GET() {
  const state = createOAuthState();
  const response = NextResponse.redirect(buildUpstoxAuthorizationUrl(state));

  response.cookies.set("upstox_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return response;
}
