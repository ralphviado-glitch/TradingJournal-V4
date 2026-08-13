export function getRecentTrades(trades = [], limit = 5) {
  return [...trades].sort((a, b) =>
    String(b.trade_date || b.date || "").localeCompare(String(a.trade_date || a.date || "")) ||
    String(b.entry_time || "").localeCompare(String(a.entry_time || ""))
  ).slice(0, limit);
}
