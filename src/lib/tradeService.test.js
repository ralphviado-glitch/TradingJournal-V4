import { describe, expect, it } from "vitest";
import { buildTradeUpdatePayload, filterDuplicateTradesForImport } from "./tradeService";

const userId = "user-123";

function trade(overrides = {}) {
  return {
    user_id: userId,
    trade_date: "2026-04-29",
    ticker: "NVDA",
    direction: "Long",
    entry_time: "09:30 AM",
    exit_time: "09:45 AM",
    entry_price: 100,
    exit_price: 102,
    shares: 50,
    pnl: 100,
    ...overrides,
  };
}

describe("trade import duplicate protection", () => {
  it("skips every trade when importing the same CSV twice", () => {
    const firstImport = [trade(), trade({ ticker: "TSLA", entry_price: 200 })];
    const secondImport = [trade(), trade({ ticker: "TSLA", entry_price: 200 })];

    const firstResult = filterDuplicateTradesForImport(firstImport, []);
    const secondResult = filterDuplicateTradesForImport(secondImport, firstResult.newTrades);

    expect(firstResult.newTrades).toHaveLength(2);
    expect(firstResult.skippedDuplicates).toBe(0);
    expect(secondResult.newTrades).toHaveLength(0);
    expect(secondResult.skippedDuplicates).toBe(2);
  });

  it("imports new trades and skips partially duplicated trades", () => {
    const existingTrades = [trade()];
    const candidateTrades = [
      trade(),
      trade({ ticker: "TSLA", entry_price: 200, exit_price: 205, pnl: 250 }),
    ];

    const result = filterDuplicateTradesForImport(candidateTrades, existingTrades);

    expect(result.newTrades).toHaveLength(1);
    expect(result.newTrades[0].ticker).toBe("TSLA");
    expect(result.skippedDuplicates).toBe(1);
  });

  it("imports completely new trades", () => {
    const candidateTrades = [
      trade(),
      trade({ ticker: "AAPL", entry_time: "10:00 AM", exit_time: "10:15 AM" }),
    ];

    const result = filterDuplicateTradesForImport(candidateTrades, []);

    expect(result.newTrades).toHaveLength(2);
    expect(result.skippedDuplicates).toBe(0);
  });
});

describe("Phase 3B persistence", () => {
  it("maps nullable management and quality fields", () => {
    const payload = buildTradeUpdatePayload({
      setup_quality: "A+",
      execution_quality: "Good",
      execution_score: "88",
      first_scale_shares: "80",
      first_scale_percent: "80",
      management_notes: "Held the runner to plan.",
    });
    expect(payload).toMatchObject({
      setup_quality: "A+", execution_quality: "Good", execution_score: 88,
      first_scale_shares: 80, first_scale_percent: 80,
      management_notes: "Held the runner to plan.",
    });
  });

  it("persists cleared Phase 3B fields as null", () => {
    expect(buildTradeUpdatePayload({ execution_score: "", setup_quality: "" })).toMatchObject({
      execution_score: null, setup_quality: null,
    });
  });
});

describe("Phase 3C persistence", () => {
  it("maps controlled, three-state, array, and numeric review fields", () => {
    const payload = buildTradeUpdatePayload({
      break_retest_setup: "unknown", displacement_present: "true", retest_present: false,
      break_level_type: "PDH", retest_quality: "Clean", qqq_alignment: "Aligned",
      rule_adherence_score: "92", rule_violations: ["Chased Entry", "Against SPY"],
      setup_review_notes: "Valid setup, late execution.",
    });
    expect(payload).toMatchObject({
      break_retest_setup: null, displacement_present: true, retest_present: false,
      break_level_type: "PDH", retest_quality: "Clean", qqq_alignment: "Aligned",
      rule_adherence_score: 92, rule_violations: ["Chased Entry", "Against SPY"],
      setup_review_notes: "Valid setup, late execution.",
    });
  });

  it("keeps cleared Phase 3C scalar values nullable and violations canonical", () => {
    expect(buildTradeUpdatePayload({ entry_trigger: "", next_level_price: "", entered_after_first_5min: "unknown", rule_violations: null })).toMatchObject({
      entry_trigger: null, next_level_price: null, entered_after_first_5min: null, rule_violations: [],
    });
  });
});

describe("Phase 5 workflow persistence", () => {
  it("maps workflow statuses, watchlist snapshots, and nullable linkage", () => {
    expect(buildTradeUpdatePayload({
      processing_status: "Partial", excursion_status: "Failed", management_status: "Derived",
      watchlist_match_status: "Matched", review_status: "Partially Reviewed",
      watchlist_item_id: "watch-1", planned_trade: true, watchlist_rank: "2",
      planned_direction: "Long", direction_matched: false, planned_setup: "Break & Retest",
      planned_key_levels: "PDH", planned_notes: "Wait for retest", processing_error: "Market data unavailable",
    })).toMatchObject({
      processing_status: "Partial", excursion_status: "Failed", management_status: "Derived",
      watchlist_match_status: "Matched", review_status: "Partially Reviewed",
      watchlist_item_id: "watch-1", planned_trade: true, watchlist_rank: 2,
      planned_direction: "Long", direction_matched: false, planned_setup: "Break & Retest",
    });
  });
});
