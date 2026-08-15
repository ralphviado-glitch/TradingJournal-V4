import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PerformanceOverview } from "./OverviewPage";

describe("performance dashboard", () => {
  it("renders authoritative KPIs, calendar preview, and five recent trades", () => {
    const trades = Array.from({ length: 6 }, (_, index) => ({ id: String(index), trade_date: `2026-08-${String(index + 1).padStart(2, "0")}`, ticker: `T${index}`, direction: "Long", pnl: 10, ...(index === 0 ? { gross_pnl: 10, fees: 2, net_pnl: 8 } : {}) }));
    const html = renderToStaticMarkup(<MemoryRouter><PerformanceOverview trades={trades} /></MemoryRouter>);
    expect(html).toContain("+$58.00"); expect(html).toContain("Cumulative Net P&amp;L"); expect(html).toContain("Current Month");
    expect((html.match(/>View<\/a>/g) || []).length).toBe(5);
  });
  it("renders a Journal action instead of empty charts", () => {
    const html = renderToStaticMarkup(<MemoryRouter><PerformanceOverview trades={[]} /></MemoryRouter>);
    expect(html).toContain("No trade data yet"); expect(html).not.toContain("Cumulative Net P&amp;L");
  });
});
