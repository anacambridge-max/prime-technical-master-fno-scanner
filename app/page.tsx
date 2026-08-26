"use client";

import { useEffect, useMemo, useState } from "react";

type Quote = {
  symbol: string;
  ltp?: number;
  changePct?: number;
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  signal?: "BUY" | "WATCH" | "NONE";
  score?: number;
};

const fmt = (value?: number) =>
  typeof value === "number"
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "—";

export default function Home() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "BUY" | "WATCH">("ALL");
  const [lastScan, setLastScan] = useState<Date | null>(null);

  async function checkConnection() {
    try {
      const res = await fetch("/api/upstox/status", { cache: "no-store" });
      const data = await res.json();
      setConnected(Boolean(data.connected));
    } catch {
      setConnected(false);
    }
  }

  async function scan() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/upstox/fno-universe", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Scanner request failed");

      const raw = Array.isArray(data) ? data : data.universe || data.data || [];
      const mapped: Quote[] = raw.map((x: any) => {
        const symbol = x.symbol || x.tradingSymbol || x.name || "—";
        const ltp = Number(x.ltp ?? x.lastPrice ?? x.close ?? NaN);
        const changePct = Number(x.changePct ?? x.change_percent ?? x.netChangePct ?? NaN);
        const volume = Number(x.volume ?? NaN);
        const dayHigh = Number(x.dayHigh ?? x.high ?? NaN);
        const dayLow = Number(x.dayLow ?? x.low ?? NaN);
        const previousClose = Number(x.previousClose ?? x.prevClose ?? NaN);
        const score = Number.isFinite(changePct) ? Math.max(0, Math.min(100, 50 + changePct * 5)) : 0;
        const signal: Quote["signal"] = score >= 65 ? "BUY" : score >= 55 ? "WATCH" : "NONE";
        return { symbol, ltp, changePct, volume, dayHigh, dayLow, previousClose, score, signal };
      });
      setQuotes(mapped);
      setLastScan(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to scan Upstox data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkConnection();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return quotes.filter((x) => {
      const matchesQuery = !q || x.symbol.toUpperCase().includes(q);
      const matchesFilter = filter === "ALL" || x.signal === filter;
      return matchesQuery && matchesFilter;
    });
  }, [quotes, query, filter]);

  const buys = quotes.filter((x) => x.signal === "BUY").length;
  const watch = quotes.filter((x) => x.signal === "WATCH").length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-7">
        <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-violet-500 shadow-[0_0_16px_rgba(139,92,246,.8)]" />
              <h1 className="text-3xl font-black tracking-tight">PRIME TECHNICAL MASTER</h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">F&amp;O Scanner • Upstox Market Data • Live signal workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm">
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
              {connected === null ? "Checking…" : connected ? "Upstox Connected" : "Upstox Disconnected"}
            </div>
            <button onClick={scan} disabled={loading} className="rounded-xl bg-violet-600 px-5 py-2.5 font-semibold hover:bg-violet-500 disabled:opacity-50">
              {loading ? "Scanning…" : "Scan Now"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card title="F&O Universe" value={quotes.length ? quotes.length.toString() : "210+"} sub="Eligible symbols" />
          <Card title="PRIME BUY" value={buys.toString()} sub="Current candidates" accent />
          <Card title="WATCH" value={watch.toString()} sub="Developing setups" />
          <Card title="Last Scan" value={lastScan ? lastScan.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"} sub="Local time" />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">F&amp;O Signal Scanner</h2>
              <p className="text-xs text-slate-500">Live data from the authenticated Upstox session. Signals are screening candidates, not investment advice.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["ALL", "BUY", "WATCH"].map((f) => (
                <button key={f} onClick={() => setFilter(f as any)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === f ? "bg-violet-600" : "bg-slate-800 text-slate-300"}`}>
                  {f}
                </button>
              ))}
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stock…" className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500" />
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Stock</th><th className="px-3 py-3">LTP</th><th className="px-3 py-3">Change</th><th className="px-3 py-3">Day High</th><th className="px-3 py-3">Day Low</th><th className="px-3 py-3">Volume</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-16 text-center text-slate-500">Click <b>Scan Now</b> to load the F&amp;O market universe.</td></tr>
                ) : rows.slice(0, 250).map((x) => {
                  const changePct = x.changePct;
                  const changeClass = changePct !== undefined && changePct > 0
                    ? "text-emerald-400"
                    : changePct !== undefined && changePct < 0
                      ? "text-red-400"
                      : "text-slate-300";

                  return (
                    <tr key={x.symbol} className="border-b border-slate-800/70 hover:bg-slate-800/40">
                      <td className="px-3 py-3 font-bold">{x.symbol}</td>
                      <td className="px-3 py-3">₹{fmt(x.ltp)}</td>
                      <td className={`px-3 py-3 font-semibold ${changeClass}`}>
                        {typeof changePct === "number" && Number.isFinite(changePct) ? `${changePct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-300">₹{fmt(x.dayHigh)}</td>
                      <td className="px-3 py-3 text-slate-300">₹{fmt(x.dayLow)}</td>
                      <td className="px-3 py-3 text-slate-300">{fmt(x.volume)}</td>
                      <td className="px-3 py-3 font-bold">{x.score ? x.score.toFixed(0) : "—"}</td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${x.signal === "BUY" ? "bg-emerald-500/15 text-emerald-400" : x.signal === "WATCH" ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-500"}`}>{x.signal}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value, sub, accent }: { title: string; value: string; sub: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p><p className={`mt-2 text-3xl font-black ${accent ? "text-emerald-400" : ""}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></div>;
}
