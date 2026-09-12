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

  const candle = describeCandle(current);
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
      direction: "NEUTRAL",
      reason: "No YH/YL interaction on the current candle; keep candidate in WATCH state.",
    };
  }

  const brokeAbove = current.close > touched.price && (previous?.close ?? current.close) <= touched.price;
  const brokeBelow = current.close < touched.price && (previous?.close ?? current.close) >= touched.price;
  const rejectedAbove = current.low < touched.price && current.close > touched.price;
  const rejectedBelow = current.high > touched.price && current.close < touched.price;

  const context = `candle close-location=${candle.closeLocation.toFixed(2)}, volume=${volume.tier}, 20 EMA=${ema.direction}`;

  // The supplied course material deliberately does not expose a complete numerical
  // confirmation formula. Therefore this layer identifies a SETUP and records the
  // evidence; a later, verified confirmation rule must promote it to CONFIRMED.
  if (brokeAbove || rejectedAbove) {
    return {
      state: "SETUP",
      direction: "LONG",
      triggerLevel: touched.name,
      triggerPrice: touched.price,
      structuralSl: current.low,
      reason: `${touched.name} bullish reaction observed; confirmation still required (${context}).`,
    };
  }

  if (brokeBelow || rejectedBelow) {
    return {
      state: "SETUP",
      direction: "SHORT",
      triggerLevel: touched.name,
      triggerPrice: touched.price,
      structuralSl: current.high,
      reason: `${touched.name} bearish reaction observed; confirmation still required (${context}).`,
    };
  }

  return {
    state: "WATCH",
    direction: "NEUTRAL",
    triggerLevel: touched.name,
    triggerPrice: touched.price,
    reason: `${touched.name} was touched, but no directional reaction is established yet.`,
  };
}
