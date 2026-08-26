import { NextResponse } from "next/server";
import { loadUpstoxToken } from "../../../../src/integrations/upstox/token-store";
import { getFullMarketQuotes } from "../../../../src/integrations/upstox/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NSE_INSTRUMENTS_URL =
  "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

interface Instrument {
  segment?: string;
  name?: string;
  exchange?: string;
  instrument_type?: string;
  instrument_key?: string;
  trading_symbol?: string;
  expiry?: number | string;
  underlying_symbol?: string;
  underlying_key?: string;
  underlying_type?: string;
  lot_size?: number;
  minimum_lot?: number;
}

async function loadNseInstruments(): Promise<Instrument[]> {
  const response = await fetch(NSE_INSTRUMENTS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to download Upstox NSE instrument master (${response.status})`);
  }

  const compressed = await response.arrayBuffer();
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("Upstox NSE instrument master is not an array");
  }

  return parsed as Instrument[];
}

function expiryMs(value: Instrument["expiry"]): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function GET() {
  try {
    const token = await loadUpstoxToken();
    if (!token) {
      return NextResponse.json(
        { connected: false, error: "No Upstox access token is stored. Connect Upstox first." },
        { status: 401 },
      );
    }

    const expiryNow = Date.now();
    if (token.expiresAt && Date.parse(token.expiresAt) <= expiryNow) {
      return NextResponse.json(
        { connected: false, error: "Stored Upstox access token has expired. Reconnect Upstox." },
        { status: 401 },
      );
    }

    const instruments = await loadNseInstruments();

    const equities = new Map<string, Instrument>();
    for (const item of instruments) {
      if (
        item.segment === "NSE_EQ" &&
        item.instrument_type === "EQ" &&
        item.instrument_key
      ) {
        equities.set(item.instrument_key, item);
      }
    }

    const nearestByUnderlying = new Map<string, Instrument>();
    for (const item of instruments) {
      if (
        item.segment !== "NSE_FO" ||
        item.instrument_type !== "FUT" ||
        item.underlying_type !== "EQUITY" ||
        !item.instrument_key ||
        !item.underlying_key
      ) {
        continue;
      }

      const expiry = expiryMs(item.expiry);
      if (expiry === null || expiry < expiryNow) continue;
      if (!equities.has(item.underlying_key)) continue;

      const current = nearestByUnderlying.get(item.underlying_key);
      if (!current || (expiryMs(current.expiry) ?? Number.MAX_SAFE_INTEGER) > expiry) {
        nearestByUnderlying.set(item.underlying_key, item);
      }
    }

    const universe = [...nearestByUnderlying.values()]
      .map((future) => {
        const equity = future.underlying_key ? equities.get(future.underlying_key) : undefined;
        return {
          symbol: future.underlying_symbol || equity?.trading_symbol || "",
          equityInstrumentKey: future.underlying_key || "",
          futuresInstrumentKey: future.instrument_key || "",
          futuresTradingSymbol: future.trading_symbol || "",
          expiry: future.expiry ?? null,
          lotSize: future.lot_size ?? future.minimum_lot ?? null,
        };
      })
      .filter((item) => item.symbol && item.equityInstrumentKey && item.futuresInstrumentKey)
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    // First authenticated market-data proof: fetch quotes for a sample of the dynamic universe.
    const sample = universe.slice(0, 20);
    const quoteData = await getFullMarketQuotes(
      token.accessToken,
      sample.map((item) => item.equityInstrumentKey),
    );

    // Upstox returns Full Market Quote objects keyed by exchange:symbol
    // (for example NSE_EQ:NHPC), while each quote also carries the canonical
    // instrument_token (for example NSE_EQ|INE848E01016). Match using the
    // canonical token first; fall back to the response key/trading symbol.
    const quoteEntries = Object.entries(quoteData);
    const quoteByInstrumentToken = new Map(
      quoteEntries
        .map(([responseKey, quote]) => [quote.instrument_token || responseKey, quote] as const)
        .filter(([key]) => Boolean(key)),
    );

    const sampleWithQuotes = sample.map((item) => {
      const canonicalQuote = quoteByInstrumentToken.get(item.equityInstrumentKey);
      const responseKey = `NSE_EQ:${item.symbol}`;
      const quote = canonicalQuote || quoteData[responseKey];

      return {
        ...item,
        quoteKey: quote ? responseKey : null,
        lastPrice: quote?.last_price ?? null,
        ohlc: quote?.ohlc ?? null,
        volume: quote?.volume ?? null,
        oi: quote?.oi ?? null,
      };
    });

    return NextResponse.json({
      connected: true,
      source: "Upstox NSE instrument master + authenticated market quotes",
      universeCount: universe.length,
      quoteSampleCount: sampleWithQuotes.filter((item) => item.lastPrice !== null).length,
      universe,
      sampleWithQuotes,
      generatedAt: new Date().toISOString(),
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown F&O universe error";
    return NextResponse.json({ connected: false, error: message }, { status: 502 });
  }
}
