import { describe, expect, it } from "vitest";
import { createEmptyAnalyticsFilters, filterStrategyTrades } from "./analyticsFilters";
import { EXIT_EFFICIENCY_BUCKETS, ROOM_R_BUCKETS, RULE_ADHERENCE_BUCKETS, bucketValue, getSampleSizeLabel } from "./analyticsBuckets";
import { buildDisplacementAnalysis, buildProcessOutcomeAnalysis, buildRetestAnalysis, buildRuleViolationAnalysis, buildSetupExecutionMatrix, summarizeTrades } from "./strategyAnalytics";

const trade = (overrides = {}) => ({ ticker: "AMD", trade_date: "2026-01-10", direction: "Long", pnl: 100, ...overrides });

describe("strategy analytics metrics", () => {
  it("calculates win rate, net, average, winners, losers, and profit factor", () => {
    expect(summarizeTrades([trade(), trade({ pnl: -50 }), trade({ pnl: 0 })])).toMatchObject({ tradeCount: 3, winRate: 33.3, netPnl: 50, averagePnl: 16.67, averageWinner: 100, averageLoser: -50, profitFactor: 2 });
  });
  it("excludes null metrics from averages", () => {
    expect(summarizeTrades([trade({ mfe_r: 2 }), trade({ mfe_r: null })]).averageMfeR).toBe(2);
  });
  it("handles no trades, all winners, and all losers", () => {
    expect(summarizeTrades([]).winRate).toBeNull();
    expect(summarizeTrades([trade(), trade({ pnl: 50 })])).toMatchObject({ winRate: 100, averageLoser: null, profitFactor: null });
    expect(summarizeTrades([trade({ pnl: -25 })])).toMatchObject({ winRate: 0, averageWinner: null, profitFactor: 0 });
  });
  it("groups displacement and retest while preserving unknown", () => {
    const trades = [trade({ displacement_present: true, displacement_quality: "Strong", retest_present: true, retest_quality: "Clean" }), trade({ displacement_present: false, retest_present: false }), trade({})];
    expect(buildDisplacementAnalysis(trades).map((row) => [row.category, row.tradeCount])).toContainEqual(["No displacement", 1]);
    expect(buildRetestAnalysis(trades).map((row) => [row.category, row.tradeCount])).toContainEqual(["Unknown", 1]);
  });
  it("buckets room, exit efficiency, and rule adherence", () => {
    expect(bucketValue(1.25, ROOM_R_BUCKETS)).toBe("1R – 1.5R");
    expect(bucketValue(80, EXIT_EFFICIENCY_BUCKETS)).toBe("75–90%");
    expect(bucketValue(94, RULE_ADHERENCE_BUCKETS)).toBe("85–94");
    expect(bucketValue(null, ROOM_R_BUCKETS)).toBe("Unknown");
  });
  it("counts violation frequency and financial impact", () => {
    const rows = buildRuleViolationAnalysis([trade({ pnl: -100, rule_violations: ["FOMO"] }), trade({ pnl: 50, rule_violations: ["FOMO", "Chased Entry"] })]);
    expect(rows.find((row) => row.category === "FOMO")).toMatchObject({ tradeCount: 2, netPnl: -50, totalLosingPnl: -100 });
  });
  it("builds setup by execution matrix", () => {
    const matrix = buildSetupExecutionMatrix([trade({ setup_quality: "A", execution_quality: "Good" })]);
    expect(matrix.data.find((row) => row.category === "A").cells.find((cell) => cell.category === "Good").tradeCount).toBe(1);
  });
  it("classifies process and outcome with the centralized rule", () => {
    const rows = buildProcessOutcomeAnalysis([trade({ setup_quality: "A", execution_quality: "Good", pnl: -10 }), trade({ setup_quality: "C", execution_quality: "Poor", pnl: 20 }), trade({})]);
    expect(rows.find((row) => row.category === "Good Process / Loss").tradeCount).toBe(1);
    expect(rows.find((row) => row.category === "Poor Process / Win").tradeCount).toBe(1);
    expect(rows.find((row) => row.category === "Unclassified").tradeCount).toBe(1);
  });
  it("applies all filters together without converting unknown fields", () => {
    const trades = [trade({ ticker: "AMD", setup_quality: "A", execution_quality: "Good", break_retest_setup: true }), trade({ ticker: "NVDA", direction: "Short", pnl: -10, break_retest_setup: null })];
    expect(filterStrategyTrades(trades, { startDate: "2026-01-01", endDate: "2026-01-31", ticker: "AMD", direction: "Long", setupQuality: "A", executionQuality: "Good", result: "Win", breakRetestOnly: "Yes" })).toHaveLength(1);
  });
  it("supports partial filters and preserves explicit false for Break & Retest", () => {
    const trades = [trade({ break_retest_setup: false }), trade({ ticker: "NVDA", break_retest_setup: null })];
    expect(filterStrategyTrades(trades, { breakRetestOnly: "No" })).toHaveLength(1);
    expect(filterStrategyTrades(trades, { ticker: "NVDA" })).toHaveLength(1);
  });
  it("supports exact, lowercase, partial, trimmed, and empty ticker searches", () => {
    const trades = [trade({ ticker: "NVDA" }), trade({ ticker: "NFLX" }), trade({ ticker: "AMD" })];
    expect(filterStrategyTrades(trades, { ticker: "NVDA" }).map((item) => item.ticker)).toEqual(["NVDA"]);
    expect(filterStrategyTrades(trades, { ticker: "nvda" }).map((item) => item.ticker)).toEqual(["NVDA"]);
    expect(filterStrategyTrades(trades, { ticker: "N" }).map((item) => item.ticker)).toEqual(["NVDA", "NFLX"]);
    expect(filterStrategyTrades(trades, { ticker: " nv " }).map((item) => item.ticker)).toEqual(["NVDA"]);
    expect(filterStrategyTrades(trades, { ticker: "" })).toHaveLength(3);
  });
  it("combines ticker search with another filter", () => {
    const trades = [trade({ ticker: "NVDA", direction: "Long" }), trade({ ticker: "NFLX", direction: "Short" })];
    expect(filterStrategyTrades(trades, { ticker: "N", direction: "Short" }).map((item) => item.ticker)).toEqual(["NFLX"]);
  });
  it("reset filters clears ticker search", () => {
    expect(createEmptyAnalyticsFilters()).toMatchObject({ ticker: "" });
  });
  it("labels sample sizes descriptively", () => {
    expect(getSampleSizeLabel(2)).toBe("Very Low Sample"); expect(getSampleSizeLabel(7)).toBe("Low Sample"); expect(getSampleSizeLabel(15)).toBe("Developing"); expect(getSampleSizeLabel(20)).toBe("More Meaningful");
  });
});
