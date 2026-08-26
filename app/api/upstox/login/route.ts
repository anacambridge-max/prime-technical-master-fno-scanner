import { NextResponse } from "next/server";
import { buildUpstoxAuthorizationUrl } from "../../../../src/integrations/upstox/oauth";
import { createOAuthState } from "../../../../src/integrations/upstox/state";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = createOAuthState();
    const authorizationUrl = buildUpstoxAuthorizationUrl(state);
    const response = NextResponse.redirect(authorizationUrl, { status: 302 });

    response.cookies.set("upstox_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unable to start Upstox OAuth";
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>Upstox connection error</title></head><body style="font-family:system-ui;max-width:760px;margin:70px auto;padding:24px"><h1>Upstox connection could not start</h1><p>${escapeHtml(message)}</p><p>Check the three UPSTOX environment variables in Vercel, then redeploy.</p><a href="/">Back to PRIME TECHNICAL MASTER</a></body></html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
