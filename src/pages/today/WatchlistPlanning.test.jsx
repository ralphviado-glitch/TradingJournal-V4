import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WatchlistPlanCard, WatchlistPlanEditor, WatchlistPlanTable } from "./TodayPage";

const plan = { ticker: "TSLA", weekly_bias: "Bullish", daily_bias: "Mixed", direction: "Long", priority: 1, relative_strength: "Strong vs QQQ", confidence: "High", long_scenario_enabled: true, long_trigger: "Clear 340", long_setup: "Break & Retest", long_invalidation: "Below 325", short_scenario_enabled: true, short_trigger: "Lose 325", short_setup: "Breakdown & Retest", short_invalidation: "Reclaim 325", bottom_line: "Prefer long unless 325 fails" };

describe("dual-scenario watchlist UI", () => {
  it("renders a concise live card with explicit LONG and SHORT labels", () => {
    const html = renderToStaticMarkup(<WatchlistPlanCard item={plan} />);
    expect(html).toContain("LONG Setup"); expect(html).toContain("SHORT Setup"); expect(html).toContain("Bottom Line"); expect(html).toContain("watchlist-bottom-chart"); expect(html).not.toContain("<table");
  });
  it("renders mobile-stackable editor sections and retains disabled scenario values", () => {
    const html = renderToStaticMarkup(<WatchlistPlanEditor draft={{ ...plan, short_scenario_enabled: false }} onChange={() => {}} />);
    expect(html).toContain("Show Trade Plan"); expect(html).toContain('aria-expanded="false"'); expect(html).not.toContain("watchlist-scenario-grid");
  });
  it("renders one responsive full-width block without a wide table or scroll wrapper", () => {
    const html = renderToStaticMarkup(<WatchlistPlanTable items={[plan]} onEdit={() => {}} onDelete={() => {}} onPreview={() => {}} />);
    expect(html).not.toContain("<table"); expect(html).not.toContain("watchlist-plan-table-wrap"); expect(html).toContain("watchlist-plan-header"); expect(html).not.toContain("watchlist-execution-grid"); expect(html).toContain("Weekly:"); expect(html).toContain("Daily:"); expect(html).toContain("RS/RW:"); expect(html).toContain("Preferred:"); expect(html).toContain("Confidence:"); expect(html).toContain("Major Support:"); expect(html).toContain("Major Resistance:"); expect(html).toContain("Show Trade Plan"); expect(html).toContain("Edit"); expect(html).toContain("Delete");
    expect(html).not.toContain("Rating"); expect(html).not.toContain("Intraday"); expect(html).not.toContain("Target");
  });
  it("shows a clickable persisted screenshot thumbnail", () => {
    const html = renderToStaticMarkup(<WatchlistPlanTable items={[{ ...plan, screenshot: "https://signed.test/chart.png" }]} onEdit={() => {}} onDelete={() => {}} onPreview={() => {}} />);
    expect(html).not.toContain("watchlist-chart-thumbnail"); expect(html).not.toContain("https://signed.test/chart.png"); expect(html).toContain("Show Trade Plan");
  });
});
