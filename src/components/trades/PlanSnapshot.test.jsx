import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompactPlanSummary } from "./QuickReviewForm";
import { DetailedPlanSnapshot } from "./TradeReviewModal";

const trade = { direction: "Short", planned_direction: "Long", preferred_direction_matched: false, planned_scenario_matched: true, plan_direction_classification: "Alternative Planned Scenario", planned_short_scenario_enabled: true, planned_short_trigger: "Lose 325", planned_short_setup: "Breakdown & Retest", planned_short_target: "312", planned_short_invalidation: "Reclaim 325", planned_long_scenario_enabled: true, planned_long_trigger: "Hold 340", planned_bottom_line: "Prefer long unless 325 fails" };

describe("trade plan snapshots", () => {
  it("keeps Quick Review compact and reports independent matches", () => {
    const html = renderToStaticMarkup(<CompactPlanSummary trade={trade} />);
    expect(html).toContain("Preferred:"); expect(html).toContain("Actual:"); expect(html).toContain("Scenario Match: Yes"); expect(html).toContain("Preferred Direction Match: No"); expect(html).toContain("SHORT PLAN");
  });
  it("shows complete planned and actual context in detailed review", () => {
    const html = renderToStaticMarkup(<DetailedPlanSnapshot trade={trade} />);
    expect(html).toContain("PLANNED:"); expect(html).toContain("ACTUAL:"); expect(html).toContain("LONG PLAN"); expect(html).toContain("SHORT PLAN"); expect(html).toContain("Alternative Planned Scenario"); expect(html).toContain("Reclaim 325");
  });
});
