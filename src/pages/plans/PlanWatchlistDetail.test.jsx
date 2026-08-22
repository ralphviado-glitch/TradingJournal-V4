import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanWatchlistDetail } from "./PlansPage";

describe("archived dual-scenario plans", () => {
  it("renders both historical plans and bottom line", () => {
    const html = renderToStaticMarkup(<PlanWatchlistDetail item={{ id: "w1", ticker: "TSLA", direction: "Long", weekly_bias: "Bullish", daily_bias: "Mixed", relative_strength: "RS vs QQQ", confidence: "High", long_scenario_enabled: true, long_trigger: "340", long_setup: "Retest 340", long_invalidation: "Lose 338", short_scenario_enabled: true, short_trigger: "325", short_setup: "Failed reclaim", short_invalidation: "Reclaim 327", bottom_line: "Wait for confirmation" }} />);
    expect(html).toContain("Show Long Plan"); expect(html).toContain("Show Short Plan"); expect(html).toContain('aria-expanded="false"'); expect(html).toContain("Wait for confirmation"); expect(html).toContain("No pre-market chart saved.");
  });
  it("labels missing historical Daily Bias and support/resistance data safely", () => { const html = renderToStaticMarkup(<PlanWatchlistDetail item={{ ticker: "OLD", direction: "Long" }} />); expect(html).toContain("Daily: Unknown"); expect(html).toContain("Major Support:"); expect(html).toContain("Major Resistance:"); });
  it("uses the same signed screenshot reference and exposes preview behavior", () => { const html = renderToStaticMarkup(<PlanWatchlistDetail item={{ ticker: "TSLA", screenshot: "https://signed.test/shared.png" }} onPreview={() => {}} />); expect(html).toContain("https://signed.test/shared.png"); expect(html).toContain("Open TSLA archived chart"); });
});
