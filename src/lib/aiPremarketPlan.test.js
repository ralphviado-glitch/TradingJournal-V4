import { describe, expect, it } from "vitest";
import { AI_DRAFT_STALE_MS, isAiDraftStale, mapAiDraftToApproval, normalizeAiTickers } from "./aiPremarketPlan";

describe("AI pre-market helpers", () => {
  it("normalizes tickers and removes duplicates", () => expect(normalizeAiTickers("nvda, AMD nvda")).toEqual(["NVDA", "AMD"]));
  it("rejects invalid and oversized ticker sets", () => {
    expect(() => normalizeAiTickers(["BAD$"])).toThrow("Invalid ticker");
    expect(() => normalizeAiTickers(Array.from({ length: 11 }, (_, index) => `T${index}`))).toThrow("no more than 10");
  });
  it("centralizes stale draft detection", () => expect(isAiDraftStale("2026-08-17T10:00:00Z", Date.parse("2026-08-17T10:00:00Z") + AI_DRAFT_STALE_MS)).toBe(true));
  it("maps user-edited draft values and deterministic levels", () => {
    const index = (ticker) => ({ ticker, weeklyBias: "Bullish", dailyBias: "Bullish", marketEnvironment: "Trending", liquidityTarget: "PDH", mostImportantLevel: 10, bullTrigger: 11, bearTrigger: 9, gamePlan: "Edited plan", levels: { pdh: 12, pdl: 8, pmh: null, pml: null } });
    const draft = { overall: { marketCondition: "Trending", expectedTradingDay: "Expansion", notes: "Edited notes" }, indexes: [index("QQQ"), index("SPY")], watchlist: [{ ticker: "NVDA", dataAvailable: true, weeklyBias: "Bullish", dailyBias: "Mixed", relativeStrength: "Strong", preferredDirection: "Long", confidence: "High", longScenarioEnabled: true, longPlan: "Edited long", longTrigger: "Above 10", longInvalidation: "9", shortScenarioEnabled: false, shortPlan: "", shortTrigger: "", shortInvalidation: "", bottomLine: "Edited", levels: {} }], metadata: { generatedAt: "2026-08-17T10:00:00Z", dataAsOf: "2026-08-17T09:59:00Z", model: null, promptVersion: "premarket-v2" } };
    const result = mapAiDraftToApproval(draft, "2026-08-17");
    expect(result.marketDay.notes).toBe("Edited notes");
    expect(result.marketDay.qqq_pdh).toBe(12);
    expect(result.marketDay).not.toHaveProperty("qqq_pmh");
    expect(result.watchlist[0]).not.toHaveProperty("pmh");
    expect(result.watchlist[0].daily_bias).toBe("Mixed");
    expect(result.watchlist[0]).not.toHaveProperty("overall_rating");
    expect(result.watchlist[0]).not.toHaveProperty("long_target");
    expect(result.watchlist[0].long_setup).toBe("Edited long");
  });
});
