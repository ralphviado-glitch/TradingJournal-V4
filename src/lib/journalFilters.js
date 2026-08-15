import { getAuthoritativePnl } from "./tradePnl";

export const emptyJournalFilters = Object.freeze({ ticker: "", setup: "ALL", result: "ALL", startDate: "", endDate: "" });

export function filterJournalTrades(trades = [], filters = emptyJournalFilters) {
  const tickerQuery = String(filters.ticker || "").trim().toLowerCase();
  return trades.filter((trade) => {
    const tickerMatches = !tickerQuery || String(trade.ticker || "").toLowerCase().includes(tickerQuery);
    const setupMatches = filters.setup === "ALL" || trade.setup === filters.setup;
    const pnl = Number(getAuthoritativePnl(trade) || 0);
    const resultMatches = filters.result === "ALL" || (filters.result === "WIN" && pnl > 0) || (filters.result === "LOSS" && pnl < 0) || (filters.result === "BREAKEVEN" && pnl === 0);
    const date = String(trade.trade_date || trade.date || "").slice(0, 10);
    return tickerMatches && setupMatches && resultMatches && (!filters.startDate || date >= filters.startDate) && (!filters.endDate || date <= filters.endDate);
  });
}
