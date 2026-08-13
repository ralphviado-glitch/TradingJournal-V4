import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanWatchlistDetail } from "./PlansPage";

describe("archived dual-scenario plans", () => {
  it("renders both historical plans and bottom line", () => {
    const html = renderToStaticMarkup(<PlanWatchlistDetail item={{ id: "w1", ticker: "TSLA", direction: "Long", long_scenario_enabled: true, long_trigger: "340", short_scenario_enabled: true, short_trigger: "325", bottom_line: "Wait for confirmation" }} />);
    expect(html).toContain("Long Plan"); expect(html).toContain("Short Plan"); expect(html).toContain("Wait for confirmation");
  });
  it("labels missing historical scenario data as unavailable", () => expect(renderToStaticMarkup(<PlanWatchlistDetail item={{ ticker: "OLD", direction: "Long" }} />)).toContain("Historical scenario data unavailable"));
});
