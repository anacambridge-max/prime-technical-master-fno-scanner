import UpstoxClient from "upstox-js-sdk";

const ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;
if (!ACCESS_TOKEN) throw new Error("UPSTOX_ACCESS_TOKEN is required for the scanner worker");

const INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

type Instrument = {
  segment?: string;
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
  status?: string;
};

async function loadUniverse() {
  const response = await fetch(INSTRUMENTS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Instrument master failed: ${response.status}`);
  const compressed = Buffer.from(await response.arrayBuffer());
  const { gunzipSync } = await import("node:zlib");
  const instruments = JSON.parse(gunzipSync(compressed).toString("utf8")) as Instrument[];
  const cash = new Map(
    instruments
      .filter(i => i.segment === "NSE_EQ" && i.instrument_type === "EQ" && i.instrument_key)
      .map(i => [i.instrument_key!, i] as const),
  );
  const now = Date.now();
  const futures = new Map<string, Instrument>();
  for (const i of instruments) {
    if (i.segment !== "NSE_FO" || i.instrument_type !== "FUT" || i.underlying_type !== "EQUITY" || !i.underlying_key || !i.instrument_key) continue;
    if (i.status && !["", "active", "ACTIVE"].includes(i.status)) continue;
    const expiry = typeof i.expiry === "number" ? i.expiry : Number(i.expiry);
    if (!Number.isFinite(expiry) || expiry < now || !cash.has(i.underlying_key)) continue;
    const key = i.underlying_key;
    const current = futures.get(key);
    const currentExpiry = current ? Number(current.expiry) : Number.MAX_SAFE_INTEGER;
    if (!current || expiry < currentExpiry) futures.set(key, i);
  }
  return [...futures.values()].flatMap(f => {
    const eq = f.underlying_key ? cash.get(f.underlying_key) : undefined;
    return eq?.instrument_key && f.instrument_key ? [eq.instrument_key, f.instrument_key] : [];
  });
}

async function main() {
  const instrumentKeys = await loadUniverse();
  console.log(`[prime-worker] subscribing to ${instrumentKeys.length} instruments`);

  const api = UpstoxClient.ApiClient.instance;
  api.authentications["OAUTH2"].accessToken = ACCESS_TOKEN;
  const streamer = new UpstoxClient.MarketDataStreamerV3(instrumentKeys, "full");

  streamer.on("open", () => console.log("[prime-worker] Upstox V3 connected"));
  streamer.on("message", (message: Buffer | string) => {
    // The official SDK exposes the V3 feed event here. Parsing/persistence is deliberately
    // kept behind this boundary so the scanner engine remains broker-agnostic.
    console.log(`[prime-worker] market update ${Buffer.isBuffer(message) ? message.length : String(message).length} bytes`);
  });
  streamer.on("error", (error: unknown) => console.error("[prime-worker] feed error", error));
  streamer.on("close", () => console.warn("[prime-worker] feed closed"));
  streamer.autoReconnect(true, 10, 20);
  streamer.connect();
}

void main().catch(error => {
  console.error("[prime-worker] fatal", error);
  process.exit(1);
});
