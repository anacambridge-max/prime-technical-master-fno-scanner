import type { PrimeCandle } from "../../domain/prime";

export function emaSeries(candles: PrimeCandle[], period = 20): Array<number | null> {
  const output: Array<number | null> = Array(candles.length).fill(null);
  if (candles.length < period) return output;

  const multiplier = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
  output[period - 1] = ema;

  for (let index = period; index < candles.length; index += 1) {
    ema = (candles[index].close - ema) * multiplier + ema;
    output[index] = ema;
  }

  return output;
}

export function emaContext(candles: PrimeCandle[], period = 20): {
  value: number | null;
  distancePct: number | null;
  direction: "UP" | "DOWN" | "FLAT" | "UNKNOWN";
} {
  const series = emaSeries(candles, period);
  const index = candles.length - 1;
  const value = series[index];
  if (value == null || index < 1 || series[index - 1] == null) {
    return { value: null, distancePct: null, direction: "UNKNOWN" };
  }

  const previous = series[index - 1] as number;
  const delta = value - previous;
  const direction = Math.abs(delta) < value * 0.00005 ? "FLAT" : delta > 0 ? "UP" : "DOWN";
  const distancePct = ((candles[index].close - value) / value) * 100;
  return { value, distancePct, direction };
}
