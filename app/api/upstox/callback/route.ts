import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "../../../../src/integrations/upstox/oauth";
import { safeEqualState } from "../../../../src/integrations/upstox/state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const expectedState = request.cookies.get("upstox_oauth_state")?.value;
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ connected: false, error }, { status: 400 });
  }

  if (!code || !expectedState || !safeEqualState(expectedState, returnedState)) {
    return NextResponse.json(
      { connected: false, error: "Invalid or expired OAuth state." },
      { status: 400 },
    );
  }

  try {
    const token = await exchangeAuthorizationCode(code);

    // Token persistence is intentionally not implemented in this first OAuth slice.
    // Stage 2 will persist the token server-side (Supabase/Postgres) with expiry metadata.
    // Never send the bearer token back to the browser.
    const response = NextResponse.json({
      connected: true,
      tokenType: token.token_type,
      expiresAt: token.expires_at ?? null,
      message: "Upstox authorization succeeded. Server-side token persistence is next.",
    });

    response.cookies.delete("upstox_oauth_state");
    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown Upstox OAuth error";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
