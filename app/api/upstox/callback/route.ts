import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "../../../../src/integrations/upstox/oauth";
import { safeEqualState } from "../../../../src/integrations/upstox/state";
import { saveUpstoxToken } from "../../../../src/integrations/upstox/token-store";

export const runtime = "nodejs";

function nextUpstoxExpiryIso(): string {
  const now = new Date();
  const expiry = new Date(now);
  // Upstox OAuth access tokens are valid until 03:30 AM IST the following
  // calendar day (or the same day when authorization happens before 03:30).
  const istHour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  const istMinute = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      minute: "2-digit",
    }).format(now),
  );
  const isBeforeExpiry = istHour < 3 || (istHour === 3 && istMinute < 30);
  if (!isBeforeExpiry) expiry.setUTCDate(expiry.getUTCDate() + 1);

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(expiry);
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T03:30:00+05:30`).toISOString();
}

function toExpiryIso(expiresAt?: number, expiresIn?: number): string {
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    return new Date(expiresAt * 1000).toISOString();
  }
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
  }
  return nextUpstoxExpiryIso();
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
