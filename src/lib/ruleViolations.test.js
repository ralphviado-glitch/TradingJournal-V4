import { describe, expect, it } from "vitest";
import { normalizeRuleViolations, ruleViolationsForDisplay, toggleRuleViolation } from "./ruleViolations";
import { validateBreakRetestReview } from "./breakRetestReview";
import { buildTradeUpdatePayload } from "./tradeService";

describe("rule violation persistence contract", () => {
  it.each([[null], [[]], [["None"]], ["None"]])("normalizes %j to canonical no violations", (value) => {
    expect(normalizeRuleViolations(value)).toEqual([]);
    expect(() => validateBreakRetestReview({ rule_violations: normalizeRuleViolations(value) })).not.toThrow();
  });

  it("persists actual Quick Review violations, including multiples", () => {
    expect(buildTradeUpdatePayload({ rule_violations: ["Chased"] }).rule_violations).toEqual(["Chased"]);
    expect(buildTradeUpdatePayload({ rule_violations: ["Chased", "FOMO"] }).rule_violations).toEqual(["Chased", "FOMO"]);
  });

  it("never allows None to coexist with an actual violation", () => {
    expect(toggleRuleViolation(["None"], "Chased")).toEqual(["Chased"]);
    expect(toggleRuleViolation(["Chased"], "None")).toEqual(["None"]);
    expect(normalizeRuleViolations(["None", "Chased"])).toEqual(["Chased"]);
  });

  it("loads empty, null, and historical None as the None presentation state", () => {
    expect(ruleViolationsForDisplay([])).toEqual(["None"]);
    expect(ruleViolationsForDisplay(null)).toEqual(["None"]);
    expect(ruleViolationsForDisplay(["None"])).toEqual(["None"]);
  });

  it("still rejects unsupported values", () => {
    expect(() => validateBreakRetestReview({ rule_violations: ["Made Up Rule"] })).toThrow(/Invalid rule violations/);
  });
});
