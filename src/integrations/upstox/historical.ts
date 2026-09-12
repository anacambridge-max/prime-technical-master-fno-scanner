export interface UpstoxHistoricalCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
}

interface HistoricalResponse {
  status?: string;
  data?: { candles?: unknown[] };
}

function parseCandle(raw: unknown): UpstoxHistoricalCandle {
  if (!Array.isArray(raw) || raw.length < 7) throw new Error("Unexpected Upstox candle format");
  const [timestamp, open, high, low, close, volume, oi] = raw;
  if (typeof timestamp !== "string") throw new Error("Upstox candle timestamp is invalid");
  return {
    timestamp,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
    oi: Number(oi),
  };
}

export async function getHistoricalCandles(
  accessToken: string,
  instrumentKey: string,
  interval = 5,
  toDate: string,
  fromDate?: string,
): Promise<UpstoxHistoricalCandle[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) throw new Error("toDate must be YYYY-MM-DD");
  if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new Error("fromDate must be YYYY-MM-DD");
  if (!Number.isInteger(interval) || interval < 1 || interval > 300) throw new Error("minute interval must be between 1 and 300");

  const encodedKey = encodeURIComponent(instrumentKey);
  const path = `/historical-candle/${encodedKey}/minutes/${interval}/${toDate}${fromDate ? `/${fromDate}` : ""}`;
  const response = await fetch(`https://api.upstox.com/v3${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const payload = (await response.json()) as HistoricalResponse | { message?: string };
  if (!response.ok) {
    const message = "message" in payload && payload.message ? `: ${payload.message}` : "";
    throw new Error(`Upstox historical candle request failed (${response.status})${message}`);
  }

  const candles = "data" in payload ? payload.data?.candles ?? [] : [];
  return candles.map(parseCandle);
}
