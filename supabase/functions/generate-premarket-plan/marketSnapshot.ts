import { buildRegularSessionUrl, preprocessSymbol } from "./planUtils.ts";

export type Candle = { timestamp: string; open: number; high: number; low: number; close: number; volume: number };
export type RequestDiagnostic = { ticker: string; interval: string; status: "available" | "unavailable" | "rate_limited" | "not_requested"; httpStatus: number | null; providerCode: number | null; providerMessage: string | null; durationMs: number };
export type SeriesResult = { candles: Candle[]; diagnostic: RequestDiagnostic };

function diagnostic(ticker: string, interval: string, status: RequestDiagnostic["status"], values: Partial<RequestDiagnostic> = {}): RequestDiagnostic {
  return { ticker, interval, status, httpStatus: values.httpStatus ?? null, providerCode: values.providerCode ?? null, providerMessage: values.providerMessage ?? null, durationMs: values.durationMs ?? 0 };
}

export async function requestMarketSeries(ticker: string, interval: string, outputsize: number, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<SeriesResult> {
  const started = performance.now();
  try {
    const response = await fetchImpl(buildRegularSessionUrl(ticker, interval, outputsize, apiKey), { signal: AbortSignal.timeout(12_000) });
    let payload: Record<string, unknown> = {};
    try { payload = await response.json(); } catch { payload = {}; }
    const providerCode = Number(payload.code);
    const providerMessage = typeof payload.message === "string" ? payload.message : null;
    const rateLimited = response.status === 429 || providerCode === 429 || /rate limit|credits|quota/i.test(providerMessage || "");
    if (rateLimited) return { candles: [], diagnostic: diagnostic(ticker, interval, "rate_limited", { httpStatus: response.status, providerCode: Number.isFinite(providerCode) ? providerCode : null, providerMessage, durationMs: Math.round(performance.now() - started) }) };
    if (!response.ok || payload.status === "error" || !Array.isArray(payload.values)) return { candles: [], diagnostic: diagnostic(ticker, interval, "unavailable", { httpStatus: response.status, providerCode: Number.isFinite(providerCode) ? providerCode : null, providerMessage, durationMs: Math.round(performance.now() - started) }) };
    const candles = payload.values.map((bar: Record<string, string>) => ({ timestamp: bar.datetime, open: Number(bar.open), high: Number(bar.high), low: Number(bar.low), close: Number(bar.close), volume: Number(bar.volume || 0) })).filter((bar: Candle) => bar.timestamp && [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite)).sort((a: Candle, b: Candle) => a.timestamp.localeCompare(b.timestamp));
    return { candles, diagnostic: diagnostic(ticker, interval, candles.length ? "available" : "unavailable", { httpStatus: response.status, durationMs: Math.round(performance.now() - started) }) };
  } catch (error) {
    return { candles: [], diagnostic: diagnostic(ticker, interval, "unavailable", { providerMessage: error instanceof Error ? error.message : "Request failed", durationMs: Math.round(performance.now() - started) }) };
  }
}

export async function prepareMarketSnapshots(symbols: string[], tradeDate: string, apiKey: string, requester = requestMarketSeries) {
  const series = Object.fromEntries(symbols.map((ticker) => [ticker, { daily: [] as Candle[] }]));
  const diagnostics: RequestDiagnostic[] = [];

  const dailyResults = await Promise.all(symbols.map((ticker) => requester(ticker, "1day", 65, apiKey)));
  dailyResults.forEach((result, index) => { series[symbols[index]].daily = result.candles; diagnostics.push(result.diagnostic); });

  symbols.forEach((ticker) => { diagnostics.push(diagnostic(ticker, "1week", "not_requested", { providerMessage: "Derived locally from daily candles" })); diagnostics.push(diagnostic(ticker, "5min", "not_requested", { providerMessage: "Not required by V1.2.4 structural plan" })); diagnostics.push(diagnostic(ticker, "1min", "not_requested", { providerMessage: "Not required by V1.2.4 structural plan" })); });

  const marketData = symbols.map((ticker) => preprocessSymbol(ticker, tradeDate, [], series[ticker].daily, [], []));
  const labels: Record<string, string> = { "1day": "Daily", "1week": "Weekly", "5min": "5m", "1min": "1m" };
  const warningSummary = symbols.map((ticker) => `${ticker}: ${diagnostics.filter((item) => item.ticker === ticker).map((item) => `${labels[item.interval]}: ${item.status === "available" ? "Available" : item.status === "rate_limited" ? "Rate limited" : item.status === "not_requested" ? "Not requested" : "Unavailable"}`).join("; ")}`);
  return { marketData, diagnostics, warningSummary };
}

// Reserved for the dormant automated mode. Active V1.2.2 uses prepareMarketSnapshots.
export async function getMarketSnapshot(ticker: string, tradeDate: string, apiKey: string) {
  const result = await prepareMarketSnapshots([ticker], tradeDate, apiKey);
  return { context: result.marketData[0], warning: result.warningSummary[0] };
}
