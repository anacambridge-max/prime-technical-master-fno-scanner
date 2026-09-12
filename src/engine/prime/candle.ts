import type { CandleContext, PrimeCandle } from "../../domain/prime";

export function describeCandle(candle: PrimeCandle): CandleContext {
  const range = Math.max(0, candle.high - candle.low);
  const body = Math.abs(candle.close - candle.open);
  const upperWick = Math.max(0, candle.high - Math.max(candle.open, candle.close));
  const lowerWick = Math.max(0, Math.min(candle.open, candle.close) - candle.low);
  const bodyPct = range === 0 ? 0 : body / range;
  const closeLocation = range === 0 ? 0.5 : (candle.close - candle.low) / range;

  return { range, body, upperWick, lowerWick, bodyPct, closeLocation };
}
