export const MARKET_TIMEZONE = "America/New_York";
export const TRADE_THE_POOL_TIMEZONE = "Pacific/Auckland";

function getParts(date, timeZone) {
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

function isValidDateParts({ year, month, day, hour, minute, second }) {
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseTradeThePoolTimestamp(rawTimestamp) {
  const match = String(rawTimestamp || "").trim().match(
    /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const parts = {
    year: Number(year), month: Number(month), day: Number(day),
    hour: Number(hour), minute: Number(minute), second: Number(second),
  };
  return isValidDateParts(parts) ? parts : null;
}

function zonedDateTimePartsToDate(parts, timeZone) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let timestamp = utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  timestamp = utcGuess - getTimeZoneOffsetMs(new Date(timestamp), timeZone);
  const date = new Date(timestamp);
  const actual = getParts(date, timeZone);
  const matches = Number(actual.year) === parts.year && Number(actual.month) === parts.month &&
    Number(actual.day) === parts.day && Number(actual.hour) === parts.hour &&
    Number(actual.minute) === parts.minute && Number(actual.second) === parts.second;
  return matches ? date : null;
}

export function tradeThePoolTimestampToUtc(rawTimestamp) {
  const parts = parseTradeThePoolTimestamp(rawTimestamp);
  if (!parts) return null;
  return zonedDateTimePartsToDate(parts, TRADE_THE_POOL_TIMEZONE)?.toISOString() || null;
}

export function formatNewYorkTimestamp(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const parts = getParts(date, MARKET_TIMEZONE);
  const hour24 = Number(parts.hour);
  const hour12 = hour24 % 12 || 12;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${String(hour12).padStart(2, "0")}:${parts.minute} ${hour24 >= 12 ? "PM" : "AM"}`,
  };
}

export function tradeThePoolTimestampToNewYork(rawTimestamp) {
  const timestampUtc = tradeThePoolTimestampToUtc(rawTimestamp);
  if (!timestampUtc) return null;
  return { ...formatNewYorkTimestamp(timestampUtc), timestampUtc, timestamp: Date.parse(timestampUtc) };
}

export function getNewYorkTradingDate(timestamp = new Date()) {
  return formatNewYorkTimestamp(timestamp).date;
}

export function getTimeZoneOffsetMs(date, timeZone = MARKET_TIMEZONE) {
  const parts = getParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - date.getTime();
}

function parseClockTime(timeString = "") {
  const cleaned = String(timeString).trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const period = match[4]?.toUpperCase();

  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  return { hour, minute, second };
}

export function marketDateTimeToUtcIso(dateString, timeString, timeZone = MARKET_TIMEZONE) {
  const dateMatch = String(dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const time = parseClockTime(timeString);

  if (!dateMatch || !time) {
    throw new Error("Trade date and time are required for market data.");
  }

  const [, year, month, day] = dateMatch;
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    time.hour,
    time.minute,
    time.second
  );
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const utcDate = new Date(utcGuess - offset);

  utcDate.setUTCSeconds(0, 0);

  return utcDate.toISOString();
}

export function buildTradeMarketDataRequest(trade) {
  const tradeDate = trade.trade_date || trade.date;
  const startTime = marketDateTimeToUtcIso(tradeDate, trade.entry_time);
  let endTime = marketDateTimeToUtcIso(tradeDate, trade.exit_time);

  if (Date.parse(endTime) <= Date.parse(startTime)) {
    endTime = new Date(Date.parse(startTime) + 60_000).toISOString();
  }

  return {
    ticker: trade.ticker,
    startTime,
    endTime,
    interval: "1min",
  };
}
