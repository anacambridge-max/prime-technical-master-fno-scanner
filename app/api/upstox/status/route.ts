import { NextResponse } from "next/server";
import { getUpstoxTokenStatus } from "../../../../src/integrations/upstox/token-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getUpstoxTokenStatus());
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown token-status error";
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}
