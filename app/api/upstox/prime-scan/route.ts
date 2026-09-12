import { NextRequest, NextResponse } from "next/server";
import { loadUpstoxToken } from "../../../../src/integrations/upstox/token-store";
import { getHistoricalCandles } from "../../../../src/integrations/upstox/historical";
import { scanPrime } from "../../../../src/engine/prime/scanner";
import type { PrimeCandle } from "../../../../src/domain/prime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function istDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function asPrimeCandle(candle: { timestamp: string; open: number; high: number; low: number; close: number; volume: number; oi: number }): PrimeCandle {
  return candle;
}

export async function GET(request: NextRequest) {
  try {
    const token = await loadUpstoxToken();
    if (!token) {
      return NextResponse.json({ connected: false, error: "No Upstox access token is stored. Connect Upstox first." }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const instrumentKey = params.get("instrument_key")?.trim();
    const toDate = params.get("to_date")?.trim();
    const fromDate = params.get("from_date")?.trim();
    const interval = Number(params.get("interval") || "5");

    if (!instrumentKey || !toDate || !fromDate) {
      return NextResponse.json({ error: "instrument_key, from_date and to_date are required" }, { status: 400 });
    }

    const historical = await getHistoricalCandles(token.accessToken, instrumentKey, interval, toDate, fromDate);
    const grouped = new Map<string, PrimeCandle[]>();

    for (const candle of historical) {
      const date = istDate(candle.timestamp);
      const list = grouped.get(date) ?? [];
      list.push(asPrimeCandle(candle));
      grouped.set(date, list);
    }

    const sessionDates = [...grouped.keys()].sort();
    const currentDate = sessionDates.at(-1);
    const previousDate = sessionDates.at(-2);

    if (!currentDate || !previousDate) {
      return NextResponse.json({
        connected: true,
        instrumentKey,
        interval,
        error: "At least two trading sessions are required to calculate YH/YL and scan the current session.",
        sessionDates,
      }, { status: 422 });
    }

    const candles = grouped.get(currentDate) ?? [];
    const previousSession = grouped.get(previousDate) ?? [];
    const result = scanPrime({ candles, previousSession });

    return NextResponse.json({
      connected: true,
      instrumentKey,
      interval,
      currentSession: currentDate,
      previousSession: previousDate,
      candleCount: candles.length,
      previousSessionCandleCount: previousSession.length,
      levels: {
        yesterdayHigh: Math.max(...previousSession.map((candle) => candle.high)),
        yesterdayLow: Math.min(...previousSession.map((candle) => candle.low)),
      },
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown Prime scan error";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
