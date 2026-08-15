import { describe, expect, it } from "vitest";
import { calculateCumulativePnl, calculateDailyPerformance, calculateMonthlyPerformance, calculateWeeklyPerformance, getMonthGrid, summarizePerformance } from "./performanceCalendar";

const trades = [
  { id: "1", trade_date: "2026-08-03", pnl: 100 }, { id: "2", trade_date: "2026-08-03", gross_pnl: -40, fees: 5, net_pnl: -45, pnl: -40 },
  { id: "3", trade_date: "2026-08-07", pnl: 0 }, { id: "4", trade_date: "2026-08-31", pnl: 20 }, { id: "5", trade_date: "2026-09-01", pnl: 50 },
];

describe("performance calendar", () => {
  it("groups stable stored New York dates and uses fee-aware P&L", () => {
    const daily = calculateDailyPerformance(trades);
    expect(daily[0]).toMatchObject({ date: "2026-08-03", netPnl: 55, totalTrades: 2, wins: 1, losses: 1, state: "profit" });
    expect(daily[1].state).toBe("breakeven");
  });
  it("calculates monthly summaries without leaking cross-month trades", () => {
    expect(calculateMonthlyPerformance(trades, "2026-08")).toMatchObject({ netPnl: 75, totalTrades: 4, daysTraded: 3, greenDays: 2, redDays: 0 });
  });
  it("builds Sunday-Saturday rows and weekly totals across a cross-month boundary", () => {
    const daily = calculateDailyPerformance(trades); const weeks = getMonthGrid(2026, 7, daily);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(calculateWeeklyPerformance(weeks).reduce((sum, week) => sum + week.netPnl, 0)).toBe(75);
  });
  it("calculates KPIs and cumulative daily P&L", () => {
    expect(summarizePerformance(trades)).toMatchObject({ netPnl: 125, wins: 3, losses: 1, breakeven: 1, averageWinner: 56.67, averageLoser: -45 });
    expect(calculateCumulativePnl(trades).map((point) => point.cumulativePnl)).toEqual([55, 55, 75, 125]);
  });
  it("supports an empty month", () => expect(calculateMonthlyPerformance([], "2026-08")).toMatchObject({ daysTraded: 0, totalTrades: 0, netPnl: 0 }));
});
