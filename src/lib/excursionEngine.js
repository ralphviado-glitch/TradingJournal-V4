import { parseExecutionNumber } from "./executionAnalysis";

function round(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(decimals));
}

export function getTradeDirection(trade) {
  const direction = String(trade?.direction || "Long").trim().toLowerCase();

  return direction === "short" ? "Short" : "Long";
}

const INCOMPATIBLE_PRICE_MESSAGE =
  "Market data does not align with the imported trade price. Check ticker and trade timestamps.";

export function normalizeCandles(candles = []) {
  return candles
    .map((candle) => ({
      timestamp: candle.timestamp || candle.t || candle.time,
      high: parseExecutionNumber(candle.high ?? candle.h),
      low: parseExecutionNumber(candle.low ?? candle.l),
    }))
    .filter((candle) => candle.timestamp && candle.high !== null && candle.low !== null);
}

export function getRiskPerShare(trade) {
  const actualEntry = getExecutionEntry(trade);
  const actualStop = parseExecutionNumber(trade.actual_stop);
  const plannedEntry = parseExecutionNumber(trade.planned_entry);
  const plannedStop = parseExecutionNumber(trade.planned_stop);
  const existingRisk = parseExecutionNumber(trade.risk);

  if (actualEntry !== null && actualStop !== null && actualEntry !== actualStop) {
    return round(Math.abs(actualEntry - actualStop));
  }

  if (plannedEntry !== null && plannedStop !== null && plannedEntry !== plannedStop) {
    return round(Math.abs(plannedEntry - plannedStop));
  }

  return existingRisk && existingRisk > 0 ? existingRisk : null;
}

export function getExecutionEntry(trade) {
  return (
    parseExecutionNumber(trade.entry_price) ??
    parseExecutionNumber(trade.actual_entry) ??
    parseExecutionNumber(trade.planned_entry)
  );
}

export function getExecutionExit(trade) {
  return (
    parseExecutionNumber(trade.exit_price) ??
    parseExecutionNumber(trade.actual_exit)
  );
}

export function validateEntryAgainstCandleRange(entry, lowest, highest) {
  const tolerance = Math.max(Math.abs(entry) * 0.02, 0.25);

  if (entry < lowest - tolerance || entry > highest + tolerance) {
    throw new Error(INCOMPATIBLE_PRICE_MESSAGE);
  }
}

export function calculateExcursionsFromCandles(trade, rawCandles = []) {
  const candles = normalizeCandles(rawCandles);
  const entry = getExecutionEntry(trade);
  const exit = getExecutionExit(trade);
  const shares = parseExecutionNumber(trade.shares);

  if (!trade || candles.length === 0 || entry === null || !shares || shares <= 0) {
    throw new Error("Valid trade details and intraday candles are required.");
  }

  const highest = Math.max(...candles.map((candle) => candle.high));
  const lowest = Math.min(...candles.map((candle) => candle.low));
  const direction = getTradeDirection(trade);

  validateEntryAgainstCandleRange(entry, lowest, highest);

  const mfePerShare = direction === "Short" ? entry - lowest : highest - entry;
  const maePerShare = direction === "Short" ? entry - highest : lowest - entry;
  const riskPerShare = getRiskPerShare(trade);
  const actualStop = parseExecutionNumber(trade.actual_stop);
  const actualRisk =
    actualStop !== null ? Math.abs(entry - actualStop) * shares : null;
  const realizedMove =
    exit === null ? null : direction === "Short" ? entry - exit : exit - entry;
  const exitEfficiency =
    realizedMove === null || mfePerShare <= 0
      ? null
      : Math.min(100, Math.max(0, (realizedMove / mfePerShare) * 100));

  const result = {
    mfe_per_share: round(Math.max(0, mfePerShare)),
    mae_per_share: round(Math.min(0, maePerShare)),
    mfe_dollars: round(Math.max(0, mfePerShare) * shares),
    mae_dollars: round(Math.min(0, maePerShare) * shares),
    mfe_r: riskPerShare ? round(Math.max(0, mfePerShare) / riskPerShare, 2) : null,
    mae_r: riskPerShare ? round(Math.min(0, maePerShare) / riskPerShare, 2) : null,
    highest_price_during_trade: round(highest),
    lowest_price_during_trade: round(lowest),
    exit_efficiency: exitEfficiency === null ? null : round(exitEfficiency, 1),
    mfe: round(Math.max(0, mfePerShare)),
    mae: round(Math.min(0, maePerShare)),
    excursion_calculated_at: new Date().toISOString(),
  };

  if (actualRisk !== null) {
    result.actual_risk = round(actualRisk);
  }

  return result;
}
