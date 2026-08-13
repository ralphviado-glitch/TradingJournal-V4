export const EMPTY_ANALYTICS_FILTERS = {
  startDate: "", endDate: "", ticker: "", direction: "ALL",
  setupQuality: "ALL", executionQuality: "ALL", result: "ALL", breakRetestOnly: "ALL",
};

export function createEmptyAnalyticsFilters() {
  return { ...EMPTY_ANALYTICS_FILTERS };
}

export function filterStrategyTrades(trades = [], filters = EMPTY_ANALYTICS_FILTERS) {
  const active = { ...EMPTY_ANALYTICS_FILTERS, ...filters };
  const tickerSearch = String(active.ticker || "").trim().toUpperCase();
  return trades.filter((trade) => {
    const date = trade.trade_date || trade.date || "";
    const pnl = Number(trade.pnl);
    return (!active.startDate || date >= active.startDate)
      && (!active.endDate || date <= active.endDate)
      && (!tickerSearch || String(trade.ticker || "").trim().toUpperCase().includes(tickerSearch))
      && (active.direction === "ALL" || trade.direction === active.direction)
      && (active.setupQuality === "ALL" || trade.setup_quality === active.setupQuality)
      && (active.executionQuality === "ALL" || trade.execution_quality === active.executionQuality)
      && (active.result === "ALL" || (active.result === "Win" ? pnl > 0 : pnl < 0))
      && (active.breakRetestOnly === "ALL"
        || (active.breakRetestOnly === "Yes" ? trade.break_retest_setup === true : trade.break_retest_setup === false));
  });
}
