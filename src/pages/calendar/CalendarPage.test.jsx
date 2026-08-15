import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PerformanceCalendar } from "./CalendarPage";

describe("Calendar rendering", () => {
  const trades = [{ id: "1", trade_date: "2026-08-14", ticker: "AMD", pnl: -78.25 }];
  it("renders a clickable numeric daily result and aligned weekly summary", () => {
    const html = renderToStaticMarkup(<PerformanceCalendar trades={trades} initialYear={2026} initialMonth={7} onSelectDay={vi.fn()} />);
    expect(html).toContain("August 2026"); expect(html).toContain("-$78.25"); expect(html).toContain("1 trade"); expect(html).toContain("Week 1");
    expect(html).toContain('aria-label="2026-08-14 -$78.25"');
  });
  it("uses a compact mobile-compatible preview structure", () => {
    const html = renderToStaticMarkup(<PerformanceCalendar trades={trades} initialYear={2026} initialMonth={7} compact />);
    expect(html).toContain("calendar-compact"); expect(html).not.toContain("calendar-week-summary");
  });
});
