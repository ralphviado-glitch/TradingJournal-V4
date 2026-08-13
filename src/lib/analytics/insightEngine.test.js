import { describe, expect, it } from "vitest";
import { buildDataCompleteness, buildTickerInsights, buildWeeklyReview, formatWeeklyReview, generateActionableInsights, analyzeRunnerContribution, listTradingWeeks, rankInsights, selectAlignmentInsight, selectExecutionLeak, selectMostExpensiveViolation, selectRoomInsights, selectSetupPatterns } from "./insightEngine";
import { buildRollingMetrics, calculateProcessStreaks, classifyTrend, splitRollingWindow } from "./rollingMetrics";

const trade = (index = 0, overrides = {}) => ({
  id: String(index), trade_date: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`, ticker: "AMD", direction: "Long", pnl: 50,
  setup_quality: "A", execution_quality: "Good", displacement_present: true, displacement_quality: "Strong",
  retest_present: true, retest_quality: "Clean", qqq_alignment: "Aligned", spy_alignment: "Aligned",
  distance_to_next_level_r: 2.5, rule_adherence_score: 90, execution_score: 88, exit_efficiency: 70, mfe_r: 1.5, mae_r: -0.5,
  ...overrides,
});
const many = (count, overrides = {}) => Array.from({ length: count }, (_, index) => trade(index, typeof overrides === "function" ? overrides(index) : overrides));

describe("deterministic insight engine", () => {
  it("selects strongest and weakest setup patterns with sample safeguards", () => {
    const trades = [...many(6, { pnl: 80 }), ...many(6, { pnl: -30, displacement_quality: "Weak", retest_quality: "Weak" })];
    const result = selectSetupPatterns(trades);
    expect(result.strongest.category).toContain("Strong"); expect(result.weakest.category).toContain("Weak");
    expect(selectSetupPatterns(many(4)).strongest).toBeNull();
  });
  it("ranks execution leaks and overlapping violations", () => {
    const trades = many(6, (index) => ({ pnl: -100, rule_violations: index < 5 ? ["Chased Entry", "FOMO"] : ["Chased Entry"] }));
    expect(selectExecutionLeak(trades).category).toBe("Chased Entry");
    expect(selectMostExpensiveViolation(trades).category).toBe("Chased Entry");
  });
  it("selects combined alignment and room insights", () => {
    const trades = [...many(5, { pnl: 100 }), ...many(5, { pnl: -20, qqq_alignment: "Against", spy_alignment: "Against", distance_to_next_level_r: 0.5 })];
    expect(selectAlignmentInsight(trades).category).toBe("Both Aligned");
    expect(selectRoomInsights(trades).best.category).toContain("2R");
  });
  it("calculates runner contribution from valid scaled trades", () => {
    const result = analyzeRunnerContribution([trade(1, { entry_price: 10, first_scale_price: 11, first_scale_shares: 80, runner_exit_price: 13, runner_shares: 20 })]);
    expect(result).toMatchObject({ tradeCount: 1, positiveCount: 1, totalRunnerPnl: 60, averageContribution: 42.9 });
  });
  it("splits the latest 20 trades from historical baseline", () => {
    const split = splitRollingWindow(many(25));
    expect(split.recent).toHaveLength(20); expect(split.historical).toHaveLength(5);
    expect(splitRollingWindow(many(8))).toMatchObject({ historical: [] });
  });
  it("classifies improving, stable, deteriorating, and missing trends", () => {
    expect(classifyTrend("winRate", 60, 50).direction).toBe("Improving");
    expect(classifyTrend("winRate", 52, 50).direction).toBe("Stable");
    expect(classifyTrend("averageRuleAdherence", 70, 80).direction).toBe("Deteriorating");
    expect(classifyTrend("winRate", 50, null).direction).toBe("N/A");
  });
  it("builds rolling metrics with and without a baseline", () => {
    expect(buildRollingMetrics(many(25)).historical).toHaveLength(5);
    expect(buildRollingMetrics(many(4)).comparisons.every((row) => row.direction === "N/A")).toBe(true);
  });
  it("tracks conservative current process streaks", () => {
    expect(calculateProcessStreaks(many(3))).toEqual({ consecutiveGoodProcess: 3, consecutivePoorProcess: 0, consecutiveRuleAdherent: 3 });
    expect(calculateProcessStreaks([...many(2), trade(3, { setup_quality: "C", execution_quality: "Poor", rule_adherence_score: 50 })]).consecutivePoorProcess).toBe(1);
  });
  it("requires five trades for ticker rankings", () => {
    expect(buildTickerInsights(many(4)).best).toBeNull();
    expect(buildTickerInsights([...many(5), ...many(5, { ticker: "NVDA", pnl: -20 })]).best.category).toBe("AMD");
  });
  it("calculates data completeness without treating missing as false", () => {
    const rows = buildDataCompleteness([trade(1, { retest_quality: null }), trade(2)]);
    expect(rows.find((row) => row.category === "Retest Quality")).toMatchObject({ completed: 1, total: 2, percentage: 50 });
  });
  it("ranks insights and caps the visible collection", () => {
    const ranked = rankInsights(Array.from({ length: 12 }, (_, index) => ({ id: String(index), priority: index, sampleSize: 10 })), 8);
    expect(ranked.visible).toHaveLength(8); expect(ranked.additional).toHaveLength(4); expect(ranked.visible[0].priority).toBe(11);
  });
  it("builds a weekly summary and copyable text", () => {
    const trades = [trade(1, { trade_date: "2026-08-03", rule_violations: ["FOMO"] }), trade(2, { trade_date: "2026-08-07", rule_violations: ["FOMO"] }), trade(3, { trade_date: "2026-08-10" })];
    expect(listTradingWeeks(trades, new Date("2026-08-15T00:00:00Z"))).toEqual(["2026-08-10", "2026-08-03"]);
    const review = buildWeeklyReview(trades, "2026-08-03");
    expect(review).toMatchObject({ tradeCount: 2, mostCommonViolation: "FOMO" });
    expect(formatWeeklyReview(review)).toContain("Weekly Trading Review");
  });
  it("handles empty data, missing Phase 3 data, all winners, and all losers", () => {
    expect(generateActionableInsights([]).visible).toEqual([]);
    expect(generateActionableInsights(many(6, { setup_quality: null, execution_quality: null, retest_quality: null })).dataCompleteness.find((row) => row.category === "Execution Quality").percentage).toBe(0);
    expect(generateActionableInsights(many(6, { pnl: 20 })).all).toBeDefined();
    expect(generateActionableInsights(many(6, { pnl: -20 })).all).toBeDefined();
  });
});
