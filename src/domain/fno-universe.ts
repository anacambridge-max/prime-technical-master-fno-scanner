import type {
  FnoStockMapping,
  UniverseBuildResult,
  UpstoxInstrument,
} from "./fno";

const ACTIVE_STATUSES = new Set(["active", "ACTIVE", "" ]);

function toExpiryDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActive(instrument: UpstoxInstrument): boolean {
  if (instrument.status === undefined) return true;
  return ACTIVE_STATUSES.has(instrument.status);
}

function isStockFuture(instrument: UpstoxInstrument): boolean {
  return (
    instrument.segment === "NSE_FO" &&
    instrument.instrument_type === "FUT" &&
    instrument.underlying_type === "EQUITY" &&
    Boolean(instrument.underlying_symbol) &&
    Boolean(instrument.underlying_key) &&
    Boolean(instrument.instrument_key) &&
    Boolean(instrument.trading_symbol) &&
    typeof instrument.lot_size === "number" &&
    instrument.lot_size > 0
  );
}

function chooseNearMonth(
  instruments: UpstoxInstrument[],
  now: Date,
): UpstoxInstrument | null {
  const candidates = instruments
    .filter(isActive)
    .map((instrument) => ({ instrument, expiry: toExpiryDate(instrument.expiry) }))
    .filter((item): item is { instrument: UpstoxInstrument; expiry: Date } => {
      return item.expiry !== null && item.expiry.getTime() >= now.getTime();
    })
    .sort((a, b) => a.expiry.getTime() - b.expiry.getTime());

  return candidates[0]?.instrument ?? null;
}

export function buildFnoUniverse(
  instruments: UpstoxInstrument[],
  cashInstrumentMap: Map<string, string>,
  now = new Date(),
): UniverseBuildResult {
  const grouped = new Map<string, UpstoxInstrument[]>();
  const rejectedContracts: UniverseBuildResult["rejectedContracts"] = [];

  for (const instrument of instruments) {
    if (!isStockFuture(instrument)) {
      rejectedContracts.push({
        instrumentKey: instrument.instrument_key ?? null,
        reason: "Not an active NSE stock FUT candidate",
      });
      continue;
    }

    const symbol = instrument.underlying_symbol!.trim().toUpperCase();
    const list = grouped.get(symbol) ?? [];
    list.push(instrument);
    grouped.set(symbol, list);
  }

  const eligibleStocks: FnoStockMapping[] = [];

  for (const [underlyingSymbol, contracts] of grouped) {
    const selected = chooseNearMonth(contracts, now);
    if (!selected) {
      rejectedContracts.push({
        instrumentKey: contracts[0]?.instrument_key ?? null,
        reason: "No non-expired active future available",
      });
      continue;
    }

    const expiry = toExpiryDate(selected.expiry);
    if (!expiry) continue;

    eligibleStocks.push({
      underlyingSymbol,
      underlyingKey: selected.underlying_key!,
      futuresInstrumentKey: selected.instrument_key!,
      futuresTradingSymbol: selected.trading_symbol!,
      expiry: expiry.toISOString(),
      lotSize: selected.lot_size!,
      cashInstrumentKey: cashInstrumentMap.get(underlyingSymbol) ?? null,
    });
  }

  eligibleStocks.sort((a, b) => a.underlyingSymbol.localeCompare(b.underlyingSymbol));

  return {
    asOf: now.toISOString(),
    eligibleStocks,
    rejectedContracts,
  };
}
