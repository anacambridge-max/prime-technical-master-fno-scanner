import type {
  CandleContext,
  PrimeCandle,
  PrimeSignal,
  VolumeContext,
} from "../../domain/prime";
import { describeCandle } from "./candle";
import { emaContext } from "./ema";
import { buildYesterdayLevels } from "./levels";
import { classifyLevelReaction } from "./reaction";
import { averageVolume, classifyVolume } from "./volume";

export interface PrimeScanInput {
  candles: PrimeCandle[];
  previousSession: PrimeCandle[];
}

export interface PrimeScanResult {
  signal: PrimeSignal;
  candle: CandleContext | null;
  volume: VolumeContext;
  ema20: ReturnType<typeof emaContext>;
}

export function scanPrime(input: PrimeScanInput): PrimeScanResult {
  const { candles, previousSession } = input;

  if (candles.length === 0) {
    return {
      signal: {
        state: "NO_TRADE",
        direction: "NEUTRAL",
        reason: "No 5-minute candle data available.",
      },
      candle: null,
      volume: { average20: null, ratio: null, tier: "NORMAL" },
      ema20: { value: null, distancePct: null, direction: "UNKNOWN" },
    };
  }

  const current = candles[candles.length - 1];
  const candle = describeCandle(current);
  const average20 = averageVolume(candles.slice(0, -1), 20);
  const volume = classifyVolume(current.volume, average20);
  const ema20 = emaContext(candles, 20);
  const levels = buildYesterdayLevels(previousSession);

  if (!levels) {
    return {
      signal: {
        state: "NO_TRADE",
        direction: "NEUTRAL",
        reason: "Previous-session data is not available; YH/YL cannot be built.",
      },
      candle,
      volume,
      ema20,
    };
  }

  return {
    signal: classifyLevelReaction(candles, levels),
    candle,
    volume,
    ema20,
  };
}
