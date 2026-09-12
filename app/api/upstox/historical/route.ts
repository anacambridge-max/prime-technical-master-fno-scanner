import { NextRequest, NextResponse } from "next/server";
import { loadUpstoxToken } from "../../../../src/integrations/upstox/token-store";
import { getHistoricalCandles } from "../../../../src/integrations/upstox/historical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await loadUpstoxToken();
    if (!token) {
      return NextResponse.json({ connected: false, error: "No Upstox access token is stored. Connect Upstox first." }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const instrumentKey = params.get("instrument_key")?.trim();
    const toDate = params.get("to_date")?.trim();
    const fromDate = params.get("from_date")?.trim() || undefined;
    const interval = Number(params.get("interval") || "5");

    if (!instrumentKey || !toDate) {
      return NextResponse.json({ error: "instrument_key and to_date are required" }, { status: 400 });
    }

    const candles = await getHistoricalCandles(token.accessToken, instrumentKey, interval, toDate, fromDate);
    return NextResponse.json({ connected: true, instrumentKey, interval, toDate, fromDate: fromDate ?? null, candles, count: candles.length });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown historical data error";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
