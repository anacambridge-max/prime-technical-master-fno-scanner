export type InstrumentType = "FUT";
export type UnderlyingType = "EQUITY";

export interface UpstoxInstrument {
  segment?: string;
  instrument_type?: string;
  instrument_key?: string;
  trading_symbol?: string;
  underlying_symbol?: string;
  underlying_key?: string;
  underlying_type?: string;
  expiry?: string | number;
  lot_size?: number;
  status?: string;
}

export interface FnoStockMapping {
  underlyingSymbol: string;
  underlyingKey: string;
  futuresInstrumentKey: string;
  futuresTradingSymbol: string;
  expiry: string;
  lotSize: number;
  cashInstrumentKey: string | null;
}

export interface UniverseBuildResult {
  asOf: string;
  eligibleStocks: FnoStockMapping[];
  rejectedContracts: Array<{ instrumentKey: string | null; reason: string }>;
}
