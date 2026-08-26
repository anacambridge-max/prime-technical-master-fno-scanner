# PRIME Scanner Worker

The Vercel app is intentionally stateless. This worker owns the long-lived Upstox Market Data Feed V3 connection, candle aggregation, and scanner state.

## Runtime

- Node.js 22+
- `UPSTOX_ACCESS_TOKEN` must be supplied as a worker secret.
- The worker subscribes only to F&O-eligible NSE cash equities plus the selected near-month stock futures.
- Do not expose the access token to the browser.

## Responsibilities

1. Refresh the NSE instrument master at startup and at the configured daily refresh time.
2. Build the dynamic NSE stock-F&O universe from `NSE_FO` + `FUT` + `EQUITY` contracts.
3. Map each underlying to its `NSE_EQ` cash instrument.
4. Maintain a V3 `full` market-data subscription.
5. Aggregate the streamed 1-minute data and maintain scanner state.
6. Persist snapshots/signals to the configured store when that adapter is enabled.

The worker is intentionally separate from Vercel because a standard serverless request is not an appropriate home for an indefinite WebSocket connection.
