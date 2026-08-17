import { describe, expect, it } from "vitest";
import { buildPlanArchive, filterPlanArchive } from "./plansArchive";
import { buildMarketDayRow } from "./marketContextService";
import { generateMarketPlanScreenshotPath } from "./storage";
import { getNewYorkTradingDate } from "./marketTime";
import { navItems } from "../components/layout/appNavigation";

describe("pre-market navigation and persistence", () => {
  it("uses the clarified navigation without a Today label", () => {
    expect(navItems.map((item) => item.label)).toEqual(["Dashboard", "Pre-Market Plan", "Plans", "Journal", "Calendar", "Analytics", "Settings"]);
    expect(navItems.some((item) => item.label === "Today")).toBe(false);
  });

  it("derives the default date in New York", () => {
    expect(getNewYorkTradingDate("2026-08-12T02:00:00.000Z")).toBe("2026-08-11");
  });

  it("keeps QQQ and SPY plan fields separate and accepts old records", () => {
    const row = buildMarketDayRow({ trade_date: "2026-08-11", qqq_intraday_bias: "Bullish", spy_intraday_bias: "Bearish", qqq_game_plan: "Long above PMH", spy_game_plan: "Short below PML" }, "u1");
    expect(row).toMatchObject({ user_id: "u1", qqq_intraday_bias: "Bullish", spy_intraday_bias: "Bearish", qqq_game_plan: "Long above PMH", spy_game_plan: "Short below PML" });
    expect(buildPlanArchive([{ trade_date: "2026-08-10", market_condition: "Range" }])).toHaveLength(1);
  });

  it("generates owned symbol-specific screenshot paths", () => {
    const file = { name: "chart.png", type: "image/png" };
    expect(generateMarketPlanScreenshotPath(file, "user-1", "2026-08-11", "QQQ", 1, "id")).toBe("user-1/2026-08-11/qqq/1-id.png");
    expect(generateMarketPlanScreenshotPath(file, "user-1", "2026-08-11", "SPY", 1, "id")).toBe("user-1/2026-08-11/spy/1-id.png");
  });
});

describe("plans archive", () => {
  const archive = buildPlanArchive(
    [{ trade_date: "2026-08-10", market_condition: "Range" }, { trade_date: "2026-08-11", market_condition: "Trending", trading_day_completed_at: "done" }],
    [{ trade_date: "2026-08-11", ticker: "NVDA", priority: 1 }, { trade_date: "2026-08-10", ticker: "AMD", priority: 1 }],
    [{ id: "t1", trade_date: "2026-08-11", ticker: "NVDA", pnl: 100, planned_trade: true, direction_matched: true, review_status: "Review Complete" }, { id: "t2", trade_date: "2026-08-11", ticker: "MU", pnl: -40, planned_trade: false }]
  );
  it("orders newest first and derives linked trade performance", () => {
    expect(archive.map((plan) => plan.trade_date)).toEqual(["2026-08-11", "2026-08-10"]);
    expect(archive[0].summary).toMatchObject({ tradesTaken: 2, netPnl: 60, winRate: 50, plannedTrades: 1, unplannedTrades: 1, directionMatches: 1, reviewsComplete: 1 });
  });
  it("filters by dates, partial watchlist ticker, condition, and completion", () => {
    expect(filterPlanArchive(archive, { ticker: "vd" }).map((plan) => plan.trade_date)).toEqual(["2026-08-11"]);
    expect(filterPlanArchive(archive, { marketCondition: "Range" })).toHaveLength(1);
    expect(filterPlanArchive(archive, { completed: "yes", dateFrom: "2026-08-11" })).toHaveLength(1);
  });
  it("shows all watchlist rows merged into the same trading date", () => {
    const merged = buildPlanArchive([{ trade_date: "2026-08-17", market_condition: "Range" }], ["NVDA", "AMD", "TSLA", "MU", "SNDK", "DELL", "INTC"].map((ticker, priority) => ({ trade_date: "2026-08-17", ticker, priority: priority + 1 })));
    expect(merged[0].watchlist.map((item) => item.ticker)).toEqual(["NVDA", "AMD", "TSLA", "MU", "SNDK", "DELL", "INTC"]);
  });
});
