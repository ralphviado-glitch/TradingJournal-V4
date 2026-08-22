export const MAX_TICKERS = 10;
export const PROMPT_VERSION = "premarket-v2";

export function buildRegularSessionUrl(ticker: string, interval: string, outputsize: number, apiKey: string) {
  const url = new URL("https://api.twelvedata.com/time_series");
  Object.entries({ symbol: ticker, interval, outputsize: String(outputsize), timezone: "America/New_York", order: "asc", format: "JSON", apikey: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

export function validateRequest(body: Record<string, unknown>) {
  const tradeDate = String(body?.tradeDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || Number.isNaN(Date.parse(`${tradeDate}T12:00:00Z`))) throw new Error("Invalid trading date.");
  if (!Array.isArray(body?.tickers)) throw new Error("Tickers must be an array.");
  const tickers = [...new Set((body.tickers as unknown[]).map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
  if (tickers.length > MAX_TICKERS) throw new Error(`Choose no more than ${MAX_TICKERS} tickers.`);
  if (tickers.some((ticker) => !/^[A-Z][A-Z0-9.-]{0,14}$/.test(ticker))) throw new Error("One or more tickers are invalid.");
  return { tradeDate, tickers, symbols: [...new Set(["QQQ", "SPY", ...tickers])] };
}

type Candle = { timestamp: string; open: number; high: number; low: number; close: number; volume: number };
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
function trend(candles: Candle[]) { if (candles.length < 2) return "Unavailable"; const recent = candles.slice(-Math.min(5, candles.length)); const change = recent.at(-1)!.close - recent[0].close; return Math.abs(change) < recent[0].close * .003 ? "Neutral" : change > 0 ? "Bullish" : "Bearish"; }

export function deriveWeeklyBias(daily: Candle[]) {
  if (daily.length < 20) return "Unavailable";
  const weeks = new Map<string, Candle[]>();
  for (const bar of daily) {
    const date = new Date(`${bar.timestamp.slice(0, 10)}T12:00:00Z`);
    const monday = new Date(date); monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10); weeks.set(key, [...(weeks.get(key) || []), bar]);
  }
  const weekly = [...weeks.values()].map((bars) => ({ open: bars[0].open, close: bars.at(-1)!.close, high: Math.max(...bars.map((bar) => bar.high)), low: Math.min(...bars.map((bar) => bar.low)) })).slice(-6);
  if (weekly.length < 4) return "Unavailable";
  const first = weekly[0], last = weekly.at(-1)!, previous = weekly.at(-2)!;
  const change = (last.close - first.close) / first.close;
  if (change > .01 && last.high > previous.high && last.low > previous.low) return "Bullish";
  if (change < -.01 && last.high < previous.high && last.low < previous.low) return "Bearish";
  if (Math.abs(change) <= .01) return "Neutral";
  return "Mixed";
}

export function preprocessSymbol(ticker: string, tradeDate: string, _weekly: Candle[], daily: Candle[], _fiveMinute: Candle[], _oneMinute: Candle[]) {
  const previous = daily.filter((bar) => bar.timestamp.slice(0, 10) < tradeDate).at(-1);
  const ranges = daily.slice(-14).map((bar) => bar.high - bar.low);
  const weeklyTrend = deriveWeeklyBias(daily);
  return {
    ticker, dataAvailability: daily.length ? weeklyTrend === "Unavailable" ? "Partial" : "Full" : "Unavailable", dataAvailable: Boolean(daily.length), weeklyTrend, dailyTrend: trend(daily),
    previousDayHigh: previous?.high ?? null, previousDayLow: previous?.low ?? null,
    recentPrice: daily.at(-1)?.close ?? null, recentVolume: daily.at(-1)?.volume ?? null,
    atr: average(ranges), majorSupport: daily.length ? Math.min(...daily.slice(-5).map((bar) => bar.low)) : null,
    majorResistance: daily.length ? Math.max(...daily.slice(-5).map((bar) => bar.high)) : null,
    recentSupport: daily.length ? Math.min(...daily.slice(-5).map((bar) => bar.low)) : null,
    recentResistance: daily.length ? Math.max(...daily.slice(-5).map((bar) => bar.high)) : null,
    dailyCloses: daily.slice(-10).map((bar) => bar.close), premarketDataIncluded: false,
  };
}

export function validateDraft(draft: Record<string, unknown>, selectedTickers: string[]) {
  if (!draft || typeof draft !== "object" || !draft.overall || !Array.isArray(draft.indexes) || !Array.isArray(draft.watchlist)) throw new Error("OpenAI returned an invalid structured plan.");
  const indexes = draft.indexes as Array<Record<string, unknown>>;
  if (!indexes.some((item) => item.ticker === "QQQ") || !indexes.some((item) => item.ticker === "SPY")) throw new Error("OpenAI response is missing QQQ or SPY analysis.");
  const returned = new Set((draft.watchlist as Array<Record<string, unknown>>).map((item) => item.ticker));
  if (selectedTickers.some((ticker) => !returned.has(ticker))) throw new Error("OpenAI response is missing a selected ticker.");
  const serialized = JSON.stringify(draft);
  if (/premarket\s+(?:is|looks|appears|remains|was|strength|weakness|strong|weak|bullish|bearish)|overnight\s+(?:structure|trend|volume)|(?:above|below|break|hold|loss of)\s+(?:PMH|PML)/i.test(serialized)) throw new Error("OpenAI returned unsupported premarket analysis.");
  return draft;
}
