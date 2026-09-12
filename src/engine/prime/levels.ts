import type { PrimeCandle, PrimeLevels } from "../../domain/prime";

export function buildYesterdayLevels(previousSession: PrimeCandle[]): PrimeLevels | null {
  if (previousSession.length === 0) return null;
  return {
    yesterdayHigh: Math.max(...previousSession.map((candle) => candle.high)),
    yesterdayLow: Math.min(...previousSession.map((candle) => candle.low)),
  };
}

export function nearestOpposingLevel(
  price: number,
  direction: "LONG" | "SHORT",
  levels: PrimeLevels,
): { name: string; price: number } | null {
  const candidates: Array<{ name: string; price: number }> = [
    { name: "YH", price: levels.yesterdayHigh },
    { name: "YL", price: levels.yesterdayLow },
    ...(levels.resistance ?? []).map((price, index) => ({ name: `R${index + 1}`, price })),
    ...(levels.support ?? []).map((price, index) => ({ name: `S${index + 1}`, price })),
  ].filter((level) => Number.isFinite(level.price));

  const opposing = direction === "LONG"
    ? candidates.filter((level) => level.price > price)
    : candidates.filter((level) => level.price < price);

  opposing.sort((a, b) => direction === "LONG" ? a.price - b.price : b.price - a.price);
  return opposing[0] ?? null;
}
