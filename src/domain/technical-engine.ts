export type Candle = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
};

export type SignalState =
  | "NEUTRAL"
  | "WATCH"
  | "SETUP"
  | "BREAKOUT"
  | "CONFIRMATION"
  | "MASTER_BUY"
  | "MASTER_SELL"
  | "TARGET"
  | "FAILED"
  | "COOLDOWN";

export type TechnicalSnapshot = {
  ema20: number | null;
  ema20Rising: boolean;
  vwap: number | null;
  vwapRising: boolean;
  atr14: number | null;
  rvol20: number | null;
  nr4: boolean;
  nr7: boolean;
  breakoutLevel: number | null;
  support: number | null;
  resistance: number | null;
  gapBreakout: boolean;
  gapContinuation: boolean;
  breakout: boolean;
  retest: boolean;
  failedBreakout: boolean;
  candleQuality: number;
  volumeGrade: 0 | 1 | 2 | 3;
  emaChop: boolean;
  score: number;
  grade: "MASTER" | "STRONG" | "GOOD" | "WATCH" | "NO_TRADE";
  state: SignalState;
  side: "BUY" | "SELL" | "NONE";
  entry: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  rr: number | null;
  reasons: string[];
  risks: string[];
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const finite = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) value = values[i] * k + value * (1 - k);
  return value;
}

export function trueRange(candle: Candle, previous?: Candle): number {
  if (!previous) return candle.high - candle.low;
  return Math.max(candle.high - candle.low, Math.abs(candle.high - previous.close), Math.abs(candle.low - previous.close));
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs = candles.map((c, i) => trueRange(c, candles[i - 1]));
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function rvol(candles: Candle[], period = 20): number | null {
  if (candles.length < period + 1) return null;
  const current = candles[candles.length - 1].volume;
  const avg = candles.slice(-(period + 1), -1).reduce((s, c) => s + c.volume, 0) / period;
  return avg > 0 ? current / avg : null;
}

export function intradayVwap(candles: Candle[]): number | null {
  if (!candles.length) return null;
  let pv = 0;
  let volume = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    volume += c.volume;
  }
  return volume > 0 ? pv / volume : null;
}

function range(c: Candle) { return Math.max(c.high - c.low, Number.EPSILON); }
function candleQuality(c: Candle): number {
  const body = Math.abs(c.close - c.open) / range(c);
  const closeLocation = (c.close - c.low) / range(c);
  const bullish = c.close >= c.open ? closeLocation : 1 - closeLocation;
  return clamp(Math.round((body * 0.6 + bullish * 0.4) * 100), 0, 100);
}

function volumeGrade(rv: number | null, breakout: boolean): 0 | 1 | 2 | 3 {
  if (!finite(rv)) return 0;
  if (rv > 2 && breakout) return 3;
  if (rv >= 1.5 && breakout) return 2;
  if (rv >= 1.0) return 1;
  return 0;
}

function grade(score: number): TechnicalSnapshot["grade"] {
  if (score >= 85) return "MASTER";
  if (score >= 75) return "STRONG";
  if (score >= 65) return "GOOD";
  if (score >= 55) return "WATCH";
  return "NO_TRADE";
}

export function evaluateTechnicalSetup(
  candles: Candle[],
  nowPrice: number,
  options: { majorLevel?: number | null; sessionCandles?: Candle[] } = {},
): TechnicalSnapshot {
  const closes = candles.map(c => c.close);
  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const ema20 = ema(closes, 20);
  const ema20Prev = closes.length >= 21 ? ema(closes.slice(0, -1), 20) : null;
  const ema20Prev2 = closes.length >= 22 ? ema(closes.slice(0, -2), 20) : null;
  const atr14 = atr(candles, 14);
  const rv = rvol(candles, 20);
  const session = options.sessionCandles ?? candles;
  const vwap = intradayVwap(session);
  const prevVwap = session.length > 1 ? intradayVwap(session.slice(0, -1)) : null;

  const lookback = candles.slice(-20, -1);
  const resistance = options.majorLevel ?? (lookback.length ? Math.max(...lookback.map(c => c.high)) : null);
  const support = lookback.length ? Math.min(...lookback.map(c => c.low)) : null;
  const breakout = finite(resistance) && current.close > resistance && (!finite(previous?.close) || previous.close <= resistance);
  const gapBreakout = finite(resistance) && current.open > resistance;
  const holdsLevel = finite(resistance) && current.close > resistance;
  const gapContinuation = gapBreakout && holdsLevel;
  const retest = finite(resistance) && current.low <= resistance * 1.001 && current.close > resistance && current.close >= current.open;
  const failedBreakout = finite(resistance) && previous?.close > resistance && current.close < resistance;

  const tr = trueRange(current, previous);
  const ranges = candles.slice(-4).map((c, i, a) => trueRange(c, candles[candles.length - 4 + i - 1]));
  const ranges7 = candles.slice(-7).map((c, i) => trueRange(c, candles[candles.length - 7 + i - 1]));
  const nr4 = ranges.length === 4 && tr <= Math.min(...ranges);
  const nr7 = ranges7.length === 7 && tr <= Math.min(...ranges7);

  const emaRising = finite(ema20) && finite(ema20Prev) && ema20 > ema20Prev;
  const strongEma = finite(ema20) && finite(ema20Prev) && finite(ema20Prev2) && ema20 > ema20Prev && ema20Prev > ema20Prev2;
  const vwapRising = finite(vwap) && finite(prevVwap) && vwap > prevVwap;
  const emaSlope = finite(ema20) && finite(ema20Prev) ? Math.abs(ema20 - ema20Prev) / Math.max(atr14 ?? 1, Number.EPSILON) : 0;
  const emaChop = Boolean(atr14 && emaSlope < 0.05 && Math.abs(nowPrice - (ema20 ?? nowPrice)) / atr14 < 0.35);
  const aboveEma = finite(ema20) && nowPrice > ema20;
  const aboveVwap = finite(vwap) && nowPrice > vwap;
  const volGrade = volumeGrade(rv, breakout || gapContinuation || retest);
  const quality = candleQuality(current);

  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];
  const bullish = aboveEma && (aboveVwap || !finite(vwap)) && (emaRising || strongEma);
  const bearish = finite(ema20) && nowPrice < ema20 && !emaRising;

  if (breakout || gapContinuation) { score += 20; reasons.push(breakout ? "Major resistance breakout" : "Gap continuation above resistance"); }
  if (finite(rv)) { score += clamp(Math.round((rv - 0.8) / 1.2 * 15), 0, 15); if (rv >= 1.5) reasons.push(`RVOL ${rv.toFixed(1)}`); }
  score += volGrade === 3 ? 10 : volGrade === 2 ? 7 : volGrade === 1 ? 3 : 0;
  if (strongEma) { score += 10; reasons.push("EMA20 rising strongly"); } else if (emaRising) score += 6;
  if (aboveVwap) { score += 10; reasons.push("Above VWAP"); } else if (finite(vwap)) score += 2;
  score += Math.round(quality / 10);
  if (quality >= 75) reasons.push("High-quality candle structure");
  if (nr7) { score += 5; reasons.push("NR7 compression"); } else if (nr4) { score += 3; reasons.push("NR4 compression"); }
  if (retest) { score += 5; reasons.push("Breakout retest held"); }
  if (finite(atr14) && finite(resistance)) score += 5;
  if (emaChop) { score -= 10; risks.push("EMA chop / low directional expansion"); }
  if (finite(atr14) && nowPrice > (resistance ?? nowPrice) + atr14 * 1.3) risks.push("Price extended more than 1.3 ATR");
  if (finite(resistance) && nowPrice < resistance && gapBreakout) risks.push("Gap has not yet confirmed a hold above resistance");

  score = clamp(score, 0, 90);
  const side: TechnicalSnapshot["side"] = bullish && (breakout || gapContinuation || retest || nr7) ? "BUY" : bearish && failedBreakout ? "SELL" : "NONE";
  const finalScore = clamp(score, 0, 100);
  const g = grade(finalScore);
  const risk = atr14 ?? Math.max(nowPrice * 0.005, 0.01);
  const entry = side === "NONE" ? null : nowPrice;
  const stopLoss = side === "BUY" ? Math.min((resistance ?? nowPrice) - risk * 0.5, nowPrice - risk) : side === "SELL" ? Math.max((resistance ?? nowPrice) + risk * 0.5, nowPrice + risk) : null;
  const oneR = entry !== null && stopLoss !== null ? Math.abs(entry - stopLoss) : null;
  const target1 = oneR !== null ? entry! + (side === "BUY" ? 1.5 : -1.5) * oneR : null;
  const target2 = oneR !== null ? entry! + (side === "BUY" ? 2 : -2) * oneR : null;
  const rr = oneR && target1 !== null ? Math.abs(target1 - entry!) / oneR : null;

  if (failedBreakout) reasons.push("Failed breakout detected");
  if (side === "BUY" && finalScore >= 75) reasons.push("Confluence qualifies for Master/Strong BUY");
  if (side === "SELL" && finalScore >= 75) reasons.push("Confluence qualifies for Master/Strong SELL");

  const state: SignalState = failedBreakout ? "FAILED" : side === "BUY" && finalScore >= 85 ? "MASTER_BUY" : side === "SELL" && finalScore >= 85 ? "MASTER_SELL" : breakout || gapContinuation ? "BREAKOUT" : nr7 || nr4 ? "SETUP" : finalScore >= 55 ? "WATCH" : "NEUTRAL";

  return {
    ema20, ema20Rising: emaRising, vwap, vwapRising, atr14, rvol20: rv,
    nr4, nr7, breakoutLevel: resistance, support, resistance, gapBreakout, gapContinuation,
    breakout, retest, failedBreakout, candleQuality: quality, volumeGrade: volGrade, emaChop,
    score: finalScore, grade: g, state, side, entry, stopLoss, target1, target2, rr,
    reasons: [...new Set(reasons)], risks: [...new Set(risks)],
  };
}
