export const primeConfig = {
  timezone: "Asia/Kolkata",
  market: {
    open: "09:15",
    close: "15:30",
    noNewSignalsAfter: "15:15",
  },
  rvol: {
    lookback: 20,
    weakMax: 0.8,
    normalMax: 1.2,
    goodMax: 1.5,
    strongMax: 2,
  },
  atr: {
    period: 14,
  },
  ema: {
    trendPeriod: 20,
  },
  risk: {
    minimumRR: 1.5,
    preferredRR: 2,
  },
  score: {
    majorLevelBreakout: 20,
    volumeRvol: 15,
    threeStarVolume: 10,
    ema20Trend: 10,
    vwap: 10,
    candleQuality: 10,
    primeSetup: 10,
    nr4Nr7: 5,
    breakoutRetest: 5,
    atrRiskReward: 5,
    fnoConfirmationBonus: 5,
    oiConfirmationBonus: 5,
    masterBuyThreshold: 75,
    masterSellThreshold: 75,
  },
} as const;
