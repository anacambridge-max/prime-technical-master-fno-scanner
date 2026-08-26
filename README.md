# PRIME TECHNICAL MASTER — F&O SCANNER

Production-grade live NSE F&O stock scanner.

## Stage 1

This repository starts with the infrastructure required to build the scanner from the final specification:

- Dynamic NSE stock-F&O universe from Upstox instrument data
- One scanner row per underlying stock
- Cash-equity primary technical instrument
- Near-month futures mapping for confirmation
- Typed domain models and configuration
- Separation between data ingestion, universe building and scanner engine

## Architecture

```text
Upstox Instrument Master
        ↓
F&O Universe Builder
        ↓
Cash/Futures Instrument Mapper
        ↓
Historical + Live Market Data
        ↓
Candle Aggregator
        ↓
PRIME Technical Engines
        ↓
F&O Confirmation / OI
        ↓
Master Score + State Machine
        ↓
API → Dashboard
```

## Runtime separation

The Next.js application will serve the dashboard/API. Persistent Upstox WebSocket ingestion and scanner computation will run in a separate worker process when required; the design does not assume a long-lived WebSocket inside standard Vercel serverless execution.

## Environment

Copy `.env.example` to `.env.local` and provide credentials only on the server/worker side.

No Upstox secret or access token belongs in browser code or source control.
