import { describe, expect, it } from "vitest";
import { buildQuickReviewPayload, createQuickReviewDraft, deriveEnteredAfterFirstFiveMinutes } from "./quickReview";
import { buildDailyDebrief } from "./dailyDebrief";
import { buildReviewQueue, getTradeReviewCompleteness } from "./reviewCompleteness";
import { getDailyCompletion } from "./dailyCompletion";
import { buildMarketDayRow } from "../marketContextService";
import { buildTradeUpdatePayload } from "../tradeService";

const baseTrade = { id: "t1", trade_date: "2026-08-11", ticker: "NVDA", direction: "Long", entry_time: "09:34:59 AM", pnl: 100 };
const complete = { setup_quality: "A", execution_quality: "Good", break_retest_setup: true, rule_adherence_score: 90, setup_review_notes: "Followed the plan." };

describe("Phase 6 quick review", () => {
  it("reuses the authoritative 0/5 through 5/5 completeness engine", () => {
    for (let count = 0; count <= 5; count += 1) {
      const values = Object.fromEntries(Object.entries(complete).slice(0, count));
      expect(getTradeReviewCompleteness({ ...baseTrade, ...values }).completedFields).toBe(count);
    }
    expect(getTradeReviewCompleteness(baseTrade).missingFields).toHaveLength(5);
  });

  it("creates and saves only the compact review fields while violations remain optional", () => {
    const payload = buildQuickReviewPayload(createQuickReviewDraft({ ...baseTrade, ...complete }));
    expect(payload).toMatchObject(complete);
    expect(payload.rule_violations).toEqual([]);
    expect(getTradeReviewCompleteness({ ...baseTrade, ...payload }).status).toBe("Review Complete");
  });

  it("persists completed and incomplete quick reviews using valid workflow values", () => {
    const draft = createQuickReviewDraft(baseTrade);
    const completedDraft = { ...draft, setupTagIds: ["tag-1"], sequence: Object.fromEntries(Object.keys(draft.sequence).map((stage) => [stage, "met"])), marketContext: "aligned", roomQuality: "clear", plannedLevel: "yes", validEntryTrigger: "yes", stopFollowed: "yes", riskFollowed: "yes", managementFollowed: "yes", exitPlanFollowed: "yes", ruleViolations: ["None"] };
    expect(buildQuickReviewPayload(completedDraft, baseTrade).review_status).toBe("Review Complete");
    expect(buildQuickReviewPayload(draft, baseTrade).review_status).toBe("Partially Reviewed");
  });

  it("removes a completed trade from deterministic queue ordering", () => {
    const trades = [baseTrade, { ...baseTrade, id: "t2", entry_time: "10:00 AM" }];
    expect(buildReviewQueue(trades).map((trade) => trade.id)).toEqual(["t1", "t2"]);
    expect(buildReviewQueue([{ ...baseTrade, ...complete }, trades[1]]).map((trade) => trade.id)).toEqual(["t2"]);
  });

  it("derives the first-five-minute boundary deterministically", () => {
    expect(deriveEnteredAfterFirstFiveMinutes({ entry_time: "09:34:59 AM" })).toBe(false);
    expect(deriveEnteredAfterFirstFiveMinutes({ entry_time: "09:35:00 AM" })).toBe(true);
    expect(deriveEnteredAfterFirstFiveMinutes({ entry_time: "bad" })).toBeNull();
    expect(deriveEnteredAfterFirstFiveMinutes({ orders: [{ timestampUtc: "2026-08-11T13:34:59.000Z" }] })).toBe(false);
    expect(deriveEnteredAfterFirstFiveMinutes({ orders: [{ timestampUtc: "2026-08-11T13:35:00.000Z" }] })).toBe(true);
  });

  it("does not overwrite hidden detailed-review evidence", () => {
    const trade = { ...baseTrade, displacement_quality: "Strong", retest_quality: "Clean" };
    const merged = { ...trade, ...buildQuickReviewPayload(createQuickReviewDraft(trade)) };
    expect(merged).toMatchObject({ displacement_quality: "Strong", retest_quality: "Clean" });
  });

  it("preserves nullable rules-followed semantics", () => {
    expect(buildTradeUpdatePayload({ rulesFollowed: null }).rules_followed).toBeNull();
    expect(buildTradeUpdatePayload({ rulesFollowed: true }).rules_followed).toBe(true);
    expect(buildTradeUpdatePayload({ rulesFollowed: false }).rules_followed).toBe(false);
  });
});

describe("Phase 6 daily debrief", () => {
  const trades = [
    { ...baseTrade, ...complete, mfe: 2, mae: -1, mfe_r: 2, mae_r: -1, exit_efficiency: 60, execution_score: 80, watchlist_match_status: "Matched", direction_matched: true, rule_violations: ["FOMO"] },
    { ...baseTrade, id: "t2", pnl: -40, setup_quality: "B", execution_quality: "Poor", break_retest_setup: false, rule_adherence_score: 50, setup_review_notes: "Chased.", rule_violations: ["FOMO"], excursion_status: "Failed" },
    { ...baseTrade, id: "t3", pnl: 0, ...complete },
  ];

  it("calculates session and deterministic process facts without coercing missing averages", () => {
    const summary = buildDailyDebrief(trades);
    expect(summary).toMatchObject({ totalTrades: 3, wins: 1, losses: 1, breakeven: 1, netPnl: 60, winRate: 33.3, mostFrequentRuleViolation: "FOMO" });
    expect(summary.averageMfe).toBe(2);
    expect(buildDailyDebrief([{ ...baseTrade, pnl: 1 }]).averageMfe).toBeNull();
    expect(summary.bestProcessTrade.pnl).toBe(100);
    expect(summary.tradeNeedingMostReview.id).toBe("t2");
  });

  it("allows completion despite optional screenshots and excursion failure once reviews are complete", () => {
    expect(getDailyCompletion(trades)).toMatchObject({ reviewPending: 0, status: "Complete", excursionPending: 3 });
  });

  it("prevents completion when a required review remains", () => {
    expect(getDailyCompletion([...trades, { ...baseTrade, id: "missing" }])).toMatchObject({ reviewPending: 1, status: "Needs Review" });
  });

  it("persists reflections and completion on the authenticated user's market-day row", () => {
    const row = buildMarketDayRow({ trade_date: "2026-08-11", reflection_well: "Waited", reflection_weakness: "Exited early", reflection_focus: "Hold plan", reflection_notes: "Quiet day", trading_day_completed_at: "2026-08-11T22:00:00Z" }, "user-1");
    expect(row).toMatchObject({ user_id: "user-1", reflection_well: "Waited", reflection_focus: "Hold plan", trading_day_completed_at: "2026-08-11T22:00:00Z" });
  });
});
