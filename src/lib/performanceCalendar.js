import { getAuthoritativePnl } from "./tradePnl";

const round = (value) => Number(value.toFixed(2));
export const getTradingDate = (trade = {}) => String(trade.trade_date || trade.date || "").slice(0, 10);
export const monthKey = (date) => String(date || "").slice(0, 7);

export function summarizePerformance(trades = []) {
  const values = trades.map((trade) => ({ trade, pnl: Number(getAuthoritativePnl(trade)) })).filter(({ pnl }) => Number.isFinite(pnl));
  const wins = values.filter(({ pnl }) => pnl > 0); const losses = values.filter(({ pnl }) => pnl < 0); const breakeven = values.filter(({ pnl }) => pnl === 0);
  const netPnl = values.reduce((sum, item) => sum + item.pnl, 0);
  const grossProfit = wins.reduce((sum, item) => sum + item.pnl, 0); const grossLoss = losses.reduce((sum, item) => sum + item.pnl, 0);
  return { totalTrades: trades.length, wins: wins.length, losses: losses.length, breakeven: breakeven.length,
    winRate: values.length ? round(wins.length / values.length * 100) : 0, netPnl: round(netPnl),
    profitFactor: grossLoss ? round(grossProfit / Math.abs(grossLoss)) : grossProfit > 0 ? null : 0,
    averageWinner: wins.length ? round(grossProfit / wins.length) : 0, averageLoser: losses.length ? round(grossLoss / losses.length) : 0,
    averageTrade: values.length ? round(netPnl / values.length) : 0,
    bestTrade: values.length ? values.reduce((best, item) => item.pnl > best.pnl ? item : best) : null,
    worstTrade: values.length ? values.reduce((worst, item) => item.pnl < worst.pnl ? item : worst) : null };
}

export function calculateDailyPerformance(trades = []) {
  const grouped = new Map();
  trades.forEach((trade) => { const date = getTradingDate(trade); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return; if (!grouped.has(date)) grouped.set(date, []); grouped.get(date).push(trade); });
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, dayTrades]) => {
    const summary = summarizePerformance(dayTrades);
    const grossPnl = round(dayTrades.reduce((sum, trade) => sum + Number(trade.gross_pnl ?? trade.pnl ?? 0), 0));
    const knownFees = dayTrades.filter((trade) => trade.fees != null); const fees = knownFees.length === dayTrades.length ? round(knownFees.reduce((sum, trade) => sum + Number(trade.fees), 0)) : null;
    return { date, trades: dayTrades, ...summary, grossPnl, fees, state: summary.netPnl > 0 ? "profit" : summary.netPnl < 0 ? "loss" : "breakeven" };
  });
}

export function getMonthGrid(year, monthIndex, daily = []) {
  const first = new Date(Date.UTC(year, monthIndex, 1)); const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array(first.getUTCDay()).fill(null); const byDate = new Map(daily.map((day) => [day.date, day]));
  for (let day = 1; day <= days; day += 1) { const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; cells.push({ date, day, performance: byDate.get(date) || null }); }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

export function calculateWeeklyPerformance(weeks = []) {
  return weeks.map((week, index) => { const trades = week.flatMap((cell) => cell?.performance?.trades || []); return { week: index + 1, ...summarizePerformance(trades) }; });
}

export function calculateMonthlyPerformance(trades = [], selectedMonth) {
  const matching = trades.filter((trade) => monthKey(getTradingDate(trade)) === selectedMonth); const daily = calculateDailyPerformance(matching); const summary = summarizePerformance(matching);
  const greenDays = daily.filter((day) => day.netPnl > 0).length; const redDays = daily.filter((day) => day.netPnl < 0).length;
  return { ...summary, daysTraded: daily.length, greenDays, redDays, breakevenDays: daily.length - greenDays - redDays,
    averageDailyPnl: daily.length ? round(summary.netPnl / daily.length) : 0, daily };
}

export function calculateCumulativePnl(trades = []) {
  let cumulative = 0;
  return calculateDailyPerformance(trades).map((day) => { cumulative += day.netPnl; return { date: day.date, dailyPnl: day.netPnl, cumulativePnl: round(cumulative) }; });
}
