# PRIME TECHNICAL MASTER — F&O SCANNER

Production-grade live NSE F&O stock scanner.

## Current stage — Upstox OAuth

The repository now contains the first Upstox connection slice:

- Server-side Upstox OAuth authorization URL generation
- Random OAuth `state` generation and callback validation
- Authorization-code → access-token exchange on the server
- No client secret or bearer token exposed to browser code
- Next.js connection-test page at `/`
- `/api/upstox/login` starts the OAuth flow
- `/api/upstox/callback` receives and validates the OAuth callback

The authorization flow follows Upstox's documented OAuth 2.0 authorization-code process. The registered redirect URI must exactly match the value configured in the Upstox app.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Put your `PRIME MASTER` API Key in `UPSTOX_CLIENT_ID`.
3. Put your `PRIME MASTER` API Secret in `UPSTOX_CLIENT_SECRET`.
4. Keep `UPSTOX_REDIRECT_URI` as:

```text
http://localhost:3000/api/upstox/callback
```

5. Run `npm install` and then `npm run dev`.
6. Open `http://localhost:3000` and click **Connect Upstox**.

The access token is deliberately not returned to the browser. Token persistence will be added server-side in the next data-persistence slice.

## Stage 1 architecture

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

## Security

Never commit `.env.local`, the Upstox API Secret, or an access token. The repository `.gitignore` excludes local environment files.

Persistent Upstox WebSocket ingestion and scanner computation will run in a separate worker when required; the architecture does not assume a long-lived WebSocket inside standard Vercel serverless execution.
