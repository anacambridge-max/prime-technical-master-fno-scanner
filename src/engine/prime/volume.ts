import type { PrimeCandle, VolumeContext, VolumeTier } from "../../domain/prime";

export function averageVolume(candles: PrimeCandle[], lookback = 20): number | null {
  if (candles.length < lookback) return null;
  const sample = candles.slice(-lookback);
  const total = sample.reduce((sum, candle) => sum + candle.volume, 0);
  return total / sample.length;
}

export function classifyVolume(currentVolume: number, average20: number | null): VolumeContext {
  if (!average20 || average20 <= 0) return { average20, ratio: null, tier: "NORMAL" };
  const ratio = currentVolume / average20;
  let tier: VolumeTier = "NORMAL";
  if (ratio >= 6.5) tier = "STAR_3";
  else if (ratio >= 4) tier = "STAR_2";
  else if (ratio >= 2) tier = "STAR_1";
  return { average20, ratio, tier };
}
