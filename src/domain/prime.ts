export type PrimeState = "WATCH" | "SETUP" | "CONFIRMED" | "INVALID" | "NO_TRADE" | "FAKE_BREAKOUT";
export type PrimeDirection = "LONG" | "SHORT" | "NEUTRAL";
export type VolumeTier = "NORMAL" | "STAR_1" | "STAR_2" | "STAR_3";

export interface PrimeCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface CandleContext {
  range: number;
  body: number;
  upperWick: number;
  lowerWick: number;
  bodyPct: number;
  closeLocation: number;
}

export interface PrimeLevels {
  yesterdayHigh: number;
  yesterdayLow: number;
  mid?: number;
  resistance?: number[];
  support?: number[];
}

export interface VolumeContext {
  average20: number | null;
  ratio: number | null;
  tier: VolumeTier;
}

export interface PrimeSignal {
  state: PrimeState;
  direction: PrimeDirection;
  triggerLevel?: string;
  triggerPrice?: number;
  structuralSl?: number;
  reason: string;
}
