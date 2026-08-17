import { describe, expect, it } from "vitest";
import { buildChatGPTPackage, extractChatGPTJson, getPlanDateMismatchMessage, validateAndMapChatGPTPlan } from "./chatgptPremarketPlan";

const snapshot = { tradeDate: "2026-08-17", metadata: { generatedAt: "2026-08-17T11:00:00Z", dataAsOf: "2026-08-17T10:59:00Z", tickersAnalyzed: ["QQQ", "SPY", "NVDA"] }, marketData: [
  { ticker: "QQQ", previousDayHigh: 100, previousDayLow: 90, atr: 4 }, { ticker: "SPY", previousDayHigh: 200, previousDayLow: 180, atr: 6 }, { ticker: "NVDA", previousDayHigh: 120, previousDayLow: 110, atr: 5 },
] };
const index = (pdh, pdl) => ({ weeklyBias: "Bullish", dailyBias: "Neutral", marketEnvironment: "Range", pdh, pdl, liquidityTarget: "PDH", mostImportantLevel: pdh, bullTrigger: pdh, bearTrigger: pdl, gamePlan: "Conditional B&R only." });
const item = (ticker = "NVDA") => ({ ticker, weeklyBias: "Bullish", dailyBias: "Bullish", relativeStrength: "RS vs QQQ", preferredDirection: "Long", confidence: "High", longScenarioEnabled: true, longPlan: "Long after B&R.", longTrigger: "Above PDH", longInvalidation: "Failed reclaim", shortScenarioEnabled: true, shortPlan: "Short only after support fails.", shortTrigger: "Below PDL", shortInvalidation: "Reclaim PDL", bottomLine: "Long preferred above PDH." });
const validPlan = () => ({ version: "premarket-v2", tradeDate: "2026-08-17", dataAsOf: "2026-08-17T10:59:00Z", premarketDataIncluded: false, overallMarket: { marketCondition: "Range", expectedTradingDay: "Selective", generalMarketNotes: "Wait for confirmation." }, qqq: index(999, 888), spy: index(777, 666), watchlist: [item()] });

describe("ChatGPT package", () => {
  it("contains the versioned prompt, output instructions, timestamps, indexes, and no credentials", () => { const text = buildChatGPTPackage(snapshot); expect(text).toContain("INSTRUCTIONS FOR CHATGPT"); expect(text).toContain("TRADING_JOURNAL_JSON"); expect(text).toContain("2026-08-17T10:59:00Z"); expect(text).toContain('"ticker": "QQQ"'); expect(text).toContain('"ticker": "SPY"'); expect(text).not.toMatch(/api[_-]?key|service.role|authorization/i); });
  it("is deterministic", () => expect(buildChatGPTPackage(snapshot)).toBe(buildChatGPTPackage(snapshot)));
  it("has no extended-hours request dependency", () => expect(buildChatGPTPackage(snapshot)).not.toContain("prepost=true"));
});

describe("ChatGPT JSON import", () => {
  it("accepts raw JSON", () => expect(extractChatGPTJson(JSON.stringify(validPlan())).version).toBe("premarket-v2"));
  it("accepts one JSON block inside a readable report", () => expect(extractChatGPTJson(`Report\n\`\`\`json\n${JSON.stringify(validPlan())}\n\`\`\``).tradeDate).toBe("2026-08-17"));
  it("rejects malformed JSON and conflicting blocks", () => { expect(() => extractChatGPTJson("{bad")) .toThrow("No valid JSON"); expect(() => extractChatGPTJson("```json\n{}\n```\n```json\n{}\n```")).toThrow("Multiple JSON"); });
  it("rejects wrong version and missing indexes", () => { const wrong = validPlan(); wrong.version = "other"; expect(() => validateAndMapChatGPTPlan(wrong, snapshot)).toThrow("Unsupported"); const noQqq = validPlan(); delete noQqq.qqq; expect(() => validateAndMapChatGPTPlan(noQqq, snapshot)).toThrow("Missing QQQ"); const noSpy = validPlan(); delete noSpy.spy; expect(() => validateAndMapChatGPTPlan(noSpy, snapshot)).toThrow("Missing SPY"); });
  it("rejects retired intraday, rating, and target fields", () => { const retired = validPlan(); retired.watchlist[0].longTarget = "130"; expect(() => validateAndMapChatGPTPlan(retired, snapshot)).toThrow("retired V1.2.4 field longTarget"); const intraday = validPlan(); intraday.qqq.intradayBias = "Bullish"; expect(() => validateAndMapChatGPTPlan(intraday, snapshot)).toThrow("retired V1.2.4 field intradayBias"); });
  it("requires Unavailable instead of a fabricated bias when history is insufficient", () => { const insufficient = structuredClone(snapshot); insufficient.marketData[2].weeklyTrend = "Unavailable"; expect(() => validateAndMapChatGPTPlan(validPlan(), insufficient)).toThrow("must be Unavailable"); const plan = validPlan(); plan.watchlist[0].weeklyBias = "Unavailable"; expect(validateAndMapChatGPTPlan(plan, insufficient).watchlist[0].weeklyBias).toBe("Unavailable"); });
  it("rejects invalid directions, duplicates, and more than ten tickers", () => { const direction = validPlan(); direction.watchlist[0].preferredDirection = "Up"; expect(() => validateAndMapChatGPTPlan(direction, snapshot)).toThrow("Preferred Direction"); const duplicate = validPlan(); duplicate.watchlist.push(item()); expect(() => validateAndMapChatGPTPlan(duplicate, snapshot)).toThrow("Duplicate"); const oversized = validPlan(); oversized.watchlist = Array.from({ length: 11 }, (_, i) => item(`T${i}`)); expect(() => validateAndMapChatGPTPlan(oversized, snapshot)).toThrow("More than 10"); });
  it("reattaches deterministic PDH/PDL and keeps PMH/PML null", () => { const draft = validateAndMapChatGPTPlan(validPlan(), snapshot); expect(draft.indexes[0].levels).toEqual({ pdh: 100, pdl: 90, pmh: null, pml: null }); expect(draft.watchlist[0].levels.pdh).toBe(120); });
  it("records manual-import metadata without a model", () => { const draft = validateAndMapChatGPTPlan(validPlan(), snapshot); expect(draft.metadata).toMatchObject({ generationSource: "chatgpt_manual_import", model: null, importedTradeDate: "2026-08-17" }); });
  it("reports a date mismatch without silently changing dates", () => expect(getPlanDateMismatchMessage("2026-08-17", "2026-08-18")).toContain("2026-08-17"));
});
