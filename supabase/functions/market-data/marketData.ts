export const MARKET_TIMEZONE = "America/New_York";
export const SUPPORTED_INTERVALS = new Set(["1min"]);
export const MAX_RANGE_MS = 12 * 60 * 60 * 1000;

export class MarketDataFunctionError extends Error {
  status: number;
  code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "MarketDataFunctionError";
    this.code = code;
    this.status = status;
  }
}

function isRfc3339(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getTimeZoneParts(date: Date, timeZone = MARKET_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
}

export function formatTwelveDataDateTime(isoString: string) {
  const parts = getTimeZoneParts(new Date(isoString));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function validateMarketDataRequest(body: Record<string, unknown>) {
  const ticker = String(body?.ticker || "").trim().toUpperCase();
  const interval = String(body?.interval || "1min").trim();
  const startTime = String(body?.startTime || "").trim();
  const endTime = String(body?.endTime || "").trim();

  if (!ticker || !/^[A-Z][A-Z0-9.-]{0,14}$/.test(ticker)) {
    throw new MarketDataFunctionError("Invalid ticker.", "INVALID_REQUEST");
  }

  if (!SUPPORTED_INTERVALS.has(interval)) {
    throw new MarketDataFunctionError("Unsupported interval.", "INVALID_REQUEST");
  }

  if (!isRfc3339(startTime) || !isRfc3339(endTime)) {
    throw new MarketDataFunctionError("Invalid timestamps.", "INVALID_REQUEST");
  }

  const start = Date.parse(startTime);
  const end = Date.parse(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new MarketDataFunctionError("Invalid market data window.", "INVALID_REQUEST");
  }

  if (end - start > MAX_RANGE_MS) {
    throw new MarketDataFunctionError("Market data window is too large.", "INVALID_REQUEST");
  }

  return {
    ticker,
    interval,
    startTime,
    endTime,
    startDate: formatTwelveDataDateTime(startTime),
    endDate: formatTwelveDataDateTime(endTime),
  };
}

export function normalizeTwelveDataResponse(response: Record<string, unknown>) {
  const status = String(response?.status || "");

  if (status === "error") {
    const code = Number(response?.code);
    const message = String(response?.message || "Twelve Data error.");

    if (code === 429 || /rate limit|credits|quota/i.test(message)) {
      throw new MarketDataFunctionError("Rate limited.", "RATE_LIMIT", 429);
    }

    throw new MarketDataFunctionError("Upstream market data error.", "UPSTREAM_ERROR", 502);
  }

  const values = response?.values;

  if (!Array.isArray(values)) {
    throw new MarketDataFunctionError("Malformed market data response.", "MALFORMED_RESPONSE", 502);
  }

  if (values.length === 0) {
    throw new MarketDataFunctionError("No candles returned.", "NO_BARS", 404);
  }

  const candles = values.map((bar) => {
    const item = bar as Record<string, unknown>;
    const timestamp = String(item.datetime || "").trim();
    const open = toNumber(item.open);
    const high = toNumber(item.high);
    const low = toNumber(item.low);
    const close = toNumber(item.close);
    const volume = toNumber(item.volume) ?? 0;

    if (!timestamp || open === null || high === null || low === null || close === null) {
      throw new MarketDataFunctionError("Malformed candle.", "MALFORMED_RESPONSE", 502);
    }

    return {
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    };
  });

  candles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return candles;
}

export function buildTwelveDataUrl(request: ReturnType<typeof validateMarketDataRequest>, apiKey: string) {
  const url = new URL("https://api.twelvedata.com/time_series");

  url.searchParams.set("symbol", request.ticker);
  url.searchParams.set("interval", request.interval);
  url.searchParams.set("start_date", request.startDate);
  url.searchParams.set("end_date", request.endDate);
  url.searchParams.set("timezone", MARKET_TIMEZONE);
  url.searchParams.set("order", "asc");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("apikey", apiKey);

  return url;
}
