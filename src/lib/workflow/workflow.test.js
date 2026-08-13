import { describe, expect, it } from "vitest";
import { buildReviewQueue, getNextIncompleteTrade, getTradeReviewCompleteness } from "./reviewCompleteness";
import { buildWatchlistLinkPayload, directionMatch, matchTradeToWatchlist } from "./watchlistMatcher";
import { getPlanDirectionResult, plannedScenarioMatch, preferredDirectionMatch } from "./planDirection";
import { getDailyCompletion } from "./dailyCompletion";
import { validateWorkflowStatuses } from "./workflowStatus";

const complete = { setup_quality: "A", execution_quality: "Good", break_retest_setup: true, rule_adherence_score: 90, setup_review_notes: "Reviewed" };
const trade = (overrides = {}) => ({ id: "1", trade_date: "2026-08-11", ticker: "NVDA", direction: "Long", pnl: 100, ...overrides });

describe("review completeness", () => {
  it("classifies not reviewed, partial, and complete", () => {
    expect(getTradeReviewCompleteness(trade())).toMatchObject({ status: "Not Reviewed", completedFields: 0, percentage: 0 });
    expect(getTradeReviewCompleteness(trade({ setup_quality: "A" }))).toMatchObject({ status: "Partially Reviewed", completedFields: 1, percentage: 20 });
    expect(getTradeReviewCompleteness(trade(complete))).toMatchObject({ status: "Review Complete", completedFields: 5, percentage: 100, missingFields: [] });
  });
  it("preserves null historical fields and reports missing areas", () => expect(getTradeReviewCompleteness(trade({ setup_quality: null })).missingFields).toContain("Setup Quality"));
  it("orders oldest incomplete first and finds next trade", () => {
    const trades = [trade({ id: "new", trade_date: "2026-08-11" }), trade({ id: "old", trade_date: "2026-08-01" }), trade({ id: "done", ...complete })];
    expect(buildReviewQueue(trades).map((item) => item.id)).toEqual(["old", "new"]);
    expect(getNextIncompleteTrade(trades, "old").id).toBe("new");
  });
});

describe("workflow status values", () => {
  it("accepts controlled statuses and rejects invalid values", () => {
    expect(validateWorkflowStatuses({ processing_status: "Partial", review_status: "Review Complete" })).toBe(true);
    expect(() => validateWorkflowStatuses({ excursion_status: "Maybe" })).toThrow(/Invalid excursion_status/);
  });
});

describe("watchlist matching", () => {
  const item = { id: "w1", trade_date: "2026-08-11", ticker: "nvda", direction: "Long", priority: 1, setup: "B&R", key_levels: "100", notes: "Plan" };
  it("matches ticker/date case-insensitively and snapshots plan", () => expect(matchTradeToWatchlist(trade(), [item]).payload).toMatchObject({ watchlist_item_id: "w1", planned_trade: true, watchlist_rank: 1, planned_direction: "Long", direction_matched: true, planned_setup: "B&R" }));
  it("returns no match and ambiguous without guessing", () => {
    expect(matchTradeToWatchlist(trade(), []).status).toBe("No Match");
    expect(matchTradeToWatchlist(trade(), [item, { ...item, id: "w2" }]).status).toBe("Ambiguous");
  });
  it("handles Long, Short, Both, and Neutral semantics", () => {
    expect(directionMatch("Long", "Long")).toBe(true); expect(directionMatch("Short", "Short")).toBe(true);
    expect(directionMatch("Both", "Short")).toBe(true); expect(directionMatch("Neutral", "Long")).toBeNull(); expect(directionMatch("Long", "Short")).toBe(false);
  });
  it("builds a manual link payload", () => expect(buildWatchlistLinkPayload(item, trade())).toMatchObject({ watchlist_match_status: "Matched", planned_notes: "Plan" }));

  it.each([
    ["long only", { direction: "Long", long_scenario_enabled: true, short_scenario_enabled: false }, "Long", true, true, "Preferred Scenario"],
    ["short only", { direction: "Short", long_scenario_enabled: false, short_scenario_enabled: true }, "Short", true, true, "Preferred Scenario"],
    ["dual alternative", { direction: "Long", long_scenario_enabled: true, short_scenario_enabled: true }, "Short", false, true, "Alternative Planned Scenario"],
    ["unplanned opposite", { direction: "Long", long_scenario_enabled: true, short_scenario_enabled: false }, "Short", false, false, "Unplanned Direction"],
    ["preferred short alternative", { direction: "Short", long_scenario_enabled: true, short_scenario_enabled: true }, "Long", false, true, "Alternative Planned Scenario"],
    ["both preferred", { direction: "Both", long_scenario_enabled: true, short_scenario_enabled: true }, "Short", true, true, "Preferred Scenario"],
    ["neutral preferred", { direction: "Neutral", long_scenario_enabled: true, short_scenario_enabled: false }, "Long", null, true, "Alternative Planned Scenario"],
    ["neither scenario", { direction: "Long", long_scenario_enabled: false, short_scenario_enabled: false }, "Long", true, false, "Unplanned Direction"],
  ])("classifies %s", (_name, plan, actual, preferredMatch, scenarioMatch, classification) => {
    expect(getPlanDirectionResult(plan, actual)).toEqual({ preferredMatch, scenarioMatch, classification });
  });

  it("keeps historical missing scenario data unknown", () => {
    expect(plannedScenarioMatch({ direction: "Long" }, "Short")).toBeNull();
    expect(getPlanDirectionResult({ direction: "Long" }, "Short").classification).toBe("Unknown");
  });

  it("snapshots dual-scenario values independently of later watchlist edits", () => {
    const plan = { ...item, direction: "Long", overall_rating: "A", long_scenario_enabled: true, long_trigger: "Hold 100", short_scenario_enabled: true, short_trigger: "Lose 95", short_target: "90", bottom_line: "Trade either confirmed break" };
    const payload = buildWatchlistLinkPayload(plan, trade({ direction: "Short" }));
    plan.short_trigger = "Edited later";
    expect(payload).toMatchObject({ preferred_direction_matched: false, planned_scenario_matched: true, plan_direction_classification: "Alternative Planned Scenario", planned_short_trigger: "Lose 95", planned_bottom_line: "Trade either confirmed break" });
  });

  it("exposes preferred matching independently", () => expect(preferredDirectionMatch("Long", "Short")).toBe(false));
});

describe("daily completion", () => {
  it("handles no trades", () => expect(getDailyCompletion([]).status).toBe("No Trades"));
  it("reports processing pending", () => expect(getDailyCompletion([trade({ processing_status: "Pending" })]).status).toBe("In Progress"));
  it("reports reviews incomplete after processing", () => expect(getDailyCompletion([trade({ processing_status: "Complete" })]).status).toBe("Needs Review"));
  it("reports complete even when excursion failed but processing is non-blocking", () => expect(getDailyCompletion([trade({ ...complete, processing_status: "Partial", excursion_status: "Failed" })])).toMatchObject({ status: "Complete", excursionPending: 1 }));
  it("aggregates mixed statuses, unplanned trades, and P&L", () => expect(getDailyCompletion([trade({ ...complete, processing_status: "Complete", excursion_status: "Calculated", watchlist_match_status: "Matched" }), trade({ id: "2", pnl: -40, processing_status: "Complete", planned_trade: false })])).toMatchObject({ totalTrades: 2, netPnl: 60, unplannedTrades: 1, reviewComplete: 1, reviewPending: 1 }));
});
