import type { PrimeCandle, PrimeLevels, PrimeSignal } from "../../domain/prime";
import { describeCandle } from "./candle";
import { emaContext } from "./ema";
import { classifyVolume, averageVolume } from "./volume";

function levelTouch(candle: PrimeCandle, level: number): boolean {
  return candle.low <= level && candle.high >= level;
}

export function classifyLevelReaction(candles: PrimeCandle[], levels: PrimeLevels): PrimeSignal {
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  if (!current) return { state: "NO_TRADE", direction: "NEUTRAL", reason: "No current candle." };

  const context = describeCandle(current);
  const volume = classifyVolume(current.volume, averageVolume(candles.slice(0, -1), 20));
  const ema = emaContext(candles, 20);
  const references = [
    { name: "YH", price: levels.yesterdayHigh },
    { name: "YL", price: levels.yesterdayLow },
  ];

  const touched = references.find((reference) => levelTouch(current, reference.price));
  if (!touched) {
    return {
      state: "WATCH",
      direction: current.close >= (ema.value ?? current.open) ? "LONG" : "SHORT",
      reason: "No YH/YL interaction on the current candle; keep candidate in WATCH state.",
    };
  }

  const bullishBreak = current.close > touched.price && (previous?.close ?? current.close) <= touched.price;
  const bearishBreak = current.close < touched.price && (previous?.close ?? current.close) >= touched.price;
  const bullishReject = current.low < touched.price && current.close > touched.price;
  const bearishReject = current.high > touched.price && current.close < touched.price;

  // The course requires confirmation after the reaction; a first penetration is not an entry.
  if (bullishBreak || bullishReject) {
    const confirmed = current.close > touched.price && context.closeLocation >= 0.6 && ema.direction !== "DOWN" && volume.tier !== "NORMAL";
    if (confirmed) {
      return {
        state: "CONFIRMED",
        direction: "LONG",
        triggerLevel: touched.name,
        triggerPrice: touched.price,
        structuralSl: current.low,
        reason: `${touched.name} reaction: close accepted above level, candle closed in upper range, volume ${volume.tier}, 20 EMA context ${ema.direction}.`,
      };
    }
    return {
      state: "SETUP",
      direction: "LONG",
      triggerLevel: touched.name,
      triggerPrice: touched.price,
      structuralSl: current.low,
      reason: `${touched.name} tested/broken but confirmation is incomplete; wait for follow-through.`,
    };
  }

  if (bearishBreak || bearishReject) {
    const confirmed = current.close < touched.price && context.closeLocation <= 0.4 && ema.direction !== "UP" && volume.tier !== "NORMAL";
    if (confirmed) {
      return {
        state: "CONFIRMED",
        direction: "SHORT",
        triggerLevel: touched.name,
        triggerPrice: touched.price,
        structuralSl: current.high,
        reason: `${touched.name} reaction: close accepted below level, candle closed in lower range, volume ${volume.tier}, 20 EMA context ${ema.direction}.`,
      };
    }
    return {
      state: "SETUP",
      direction: "SHORT",
      triggerLevel: touched.name,
      triggerPrice: touched.price,
      structuralSl: current.high,
      reason: `${touched.name} tested/broken but confirmation is incomplete; wait for follow-through.`,
    };
  }

  return { state: "WATCH", direction: "NEUTRAL", triggerLevel: touched.name, triggerPrice: touched.price, reason: `${touched.name} was touched but no confirmed reaction exists.` };
}
