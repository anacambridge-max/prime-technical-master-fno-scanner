import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "../../../../src/integrations/upstox/oauth";
import { safeEqualState } from "../../../../src/integrations/upstox/state";
import { saveUpstoxToken } from "../../../../src/integrations/upstox/token-store";

export const runtime = "nodejs";

function toExpiryIso(expiresAt?: number, expiresIn?: number): string | null {
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    return new Date(expiresAt * 1000).toISOString();
  }
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ connected: false, error }, { status: 400 });
  }

  if (!code || !safeEqualState(returnedState)) {
    return NextResponse.json(
      { connected: false, error: "Invalid or expired OAuth state." },
      { status: 400 },
    );
  }

  try {
    const token = await exchangeAuthorizationCode(code);
    const expiresAt = toExpiryIso(token.expires_at, token.expires_in);

    await saveUpstoxToken({
      accessToken: token.access_token,
      tokenType: token.token_type || "Bearer",
      expiresAt,
    });

    return NextResponse.json({
      connected: true,
      expiresAt,
      message: "Upstox authorization succeeded and the access token was stored securely on the server.",
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown Upstox OAuth error";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
