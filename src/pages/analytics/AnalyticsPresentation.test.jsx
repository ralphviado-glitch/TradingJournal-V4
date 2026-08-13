import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalysisSection, AnalyticsCategoryList } from "./AnalyticsPage";

const populated = { category: "Strong", tradeCount: 12, sampleLabel: "Adequate", winRate: 58, netPnl: 320, averagePnl: 26.67, averageMfeR: 1.4 };

describe("analytics presentation", () => {
  it("renders unchanged primary values and available secondary metrics in a compact row", () => {
    const html = renderToStaticMarkup(<AnalyticsCategoryList rows={[populated]} secondaryFields={["averageMfeR"]} />);
    expect(html).toContain("12 trades");
    expect(html).toContain("58% WR");
    expect(html).toContain("$320.00 net");
    expect(html).toContain("$26.67 avg");
    expect(html).toContain("1.4R");
    expect(html).not.toContain("<table");
  });

  it("compresses zero samples while retaining Unknown as its own category", () => {
    const html = renderToStaticMarkup(<AnalyticsCategoryList rows={[{ ...populated, category: "Unknown", tradeCount: 0 }]} />);
    expect(html).toContain("Unknown");
    expect(html).toContain("No sample");
    expect(html).not.toContain("N/A");
  });

  it("renders accessible expanded and collapsed section defaults", () => {
    const expanded = renderToStaticMarkup(<AnalysisSection title="Break & Retest Quality" defaultExpanded><span>details</span></AnalysisSection>);
    const collapsed = renderToStaticMarkup(<AnalysisSection title="Market Alignment"><span>details</span></AnalysisSection>);
    expect(expanded).toContain("aria-expanded=\"true\"");
    expect(expanded).toContain("details");
    expect(collapsed).toContain("aria-expanded=\"false\"");
    expect(collapsed).not.toContain("details");
  });
});
