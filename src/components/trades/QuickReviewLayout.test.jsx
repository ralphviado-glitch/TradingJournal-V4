import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROOM_QUALITY_OPTIONS } from "../../lib/quickReviewPresentation";
import { gradeTradeReview } from "../../lib/tradeGrading";

const css = readFileSync(new URL("../../styles/index.css", import.meta.url), "utf8");
const review = { setupTagIds:["tag"], sequence:{break:"met",displacement:"met",acceptance:"met",retest:"met",hold:"met",trigger:"met"}, marketContext:"aligned",roomQuality:"marginal",plannedLevel:"yes",validEntryTrigger:"yes",stopFollowed:"yes",riskFollowed:"yes",managementFollowed:"yes",exitPlanFollowed:"yes",ruleViolations:["None"] };

describe("V1.3.2.1 Quick Review layout", () => {
  it("renders Tight while retaining the historical marginal grading value", () => {
    expect(ROOM_QUALITY_OPTIONS).toContainEqual(["marginal", "Tight"]);
    expect(ROOM_QUALITY_OPTIONS.flat()).not.toContain("Marginal");
    expect(gradeTradeReview(review).scoreBreakdown.setupScore).toBe(95);
  });

  it("defines the requested desktop grids and responsive stacking", () => {
    expect(css).toMatch(/\.review-tag-grid\{display:grid;grid-template-columns:repeat\(2/);
    expect(css).toMatch(/\.sequence-grid\{display:grid;grid-template-columns:repeat\(3/);
    expect(css).toMatch(/\.context-grid\{display:grid;grid-template-columns:repeat\(3/);
    expect(css).toMatch(/\.execution-grid\{display:grid;grid-template-columns:repeat\(5/);
    expect(css).toMatch(/\.review-evidence-grid\{display:grid;grid-template-columns:repeat\(2/);
    expect(css).toMatch(/@media\(max-width:720px\).*\.review-tag-grid,\.context-grid,\.grade-values\{grid-template-columns:1fr\}/s);
  });

  it("prevents modal horizontal overflow and enlarges the review note", () => {
    expect(css).toMatch(/\.trade-review-modal\{[^}]*overflow-x:hidden/);
    expect(css).toMatch(/\.review-note-field textarea\{min-height:100px/);
  });
});
