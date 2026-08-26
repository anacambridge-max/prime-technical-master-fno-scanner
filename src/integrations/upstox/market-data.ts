import { getUpstoxConfig } from "./config";

export interface UpstoxMarketQuote {
  ohlc?: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
  };
  last_price?: number;
  volume?: number;
  average_price?: number;
  oi?: number;
  instrument_token?: string;
  [key: string]: unknown;
}

interface QuoteResponse {
  status?: string;
  data?: Record<string, UpstoxMarketQuote>;
  [key: string]: unknown;
}

export async function getFullMarketQuotes(
  accessToken: string,
  instrumentKeys: string[],
): Promise<Record<string, UpstoxMarketQuote>> {
  if (instrumentKeys.length === 0) return {};

  const config = getUpstoxConfig();
  const uniqueKeys = [...new Set(instrumentKeys)].slice(0, 500);
  const url = new URL(`${config.apiBaseUrl}/market-quote/quotes`);
  url.searchParams.set("instrument_key", uniqueKeys.join(","));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload: QuoteResponse | { message?: string; error?: string } = {};

  if (text.trim()) {
    try {
      payload = JSON.parse(text) as QuoteResponse | { message?: string; error?: string };
    } catch {
      throw new Error(`Upstox market quote returned invalid JSON (${response.status})`);
    }
  }

  if (!response.ok) {
    const message = "message" in payload ? payload.message : undefined;
    const error = "error" in payload ? payload.error : undefined;
    throw new Error(
      `Upstox market quote failed (${response.status})${message || error ? `: ${message || error}` : ""}`,
    );
  }

  return "data" in payload && payload.data ? payload.data : {};
}
