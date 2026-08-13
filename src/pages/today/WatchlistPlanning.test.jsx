import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WatchlistPlanCard, WatchlistPlanEditor } from "./TodayPage";

const plan = { ticker: "TSLA", overall_rating: "A", direction: "Long", priority: 1, intraday_bias: "Bullish Reversal", relative_strength: "Strong vs QQQ", confidence: "High", long_scenario_enabled: true, long_trigger: "Clear 340", long_setup: "Break & Retest", long_target: "350", long_invalidation: "Below 325", short_scenario_enabled: true, short_trigger: "Lose 325", short_setup: "Breakdown & Retest", short_target: "312", short_invalidation: "Reclaim 325", bottom_line: "Prefer long unless 325 fails" };

describe("dual-scenario watchlist UI", () => {
  it("renders a concise live card with explicit LONG and SHORT labels", () => {
    const html = renderToStaticMarkup(<WatchlistPlanCard item={plan} />);
    expect(html).toContain("LONG"); expect(html).toContain("SHORT"); expect(html).toContain("Prefer LONG"); expect(html).toContain("Bottom Line"); expect(html).not.toContain("<table");
  });
  it("renders mobile-stackable editor sections and retains disabled scenario values", () => {
    const html = renderToStaticMarkup(<WatchlistPlanEditor draft={{ ...plan, short_scenario_enabled: false }} onChange={() => {}} />);
    expect(html).toContain("watchlist-scenario-grid"); expect(html).toContain("LONG Scenario"); expect(html).toContain("SHORT Scenario"); expect(html).toContain("Saved values are retained");
  });
});
