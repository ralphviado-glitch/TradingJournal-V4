import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TradeReviewModal from "./TradeReviewModal";

function trade(overrides = {}) {
  return {
    id: "trade-1",
    ticker: "AMD",
    direction: "Long",
    trade_date: "2025-11-12",
    pnl: 79.8,
    entry_price: 150,
    exit_price: 151,
    shares: 80,
    setup: "Breakout",
    grade: "A",
    mistakeTags: ["None"],
    emotionTags: ["Calm"],
    rulesFollowed: true,
    orders: [],
    ...overrides,
  };
}

describe("TradeReviewModal", () => {
  it("renders the selected trade's full review identity and details", () => {
    const html = renderToStaticMarkup(
      <TradeReviewModal trade={trade()} reviews={["Good discipline"]} onClose={() => {}} />
    );
    expect(html).toContain("AMD LONG");
    expect(html).toContain("2025-11-12");
    expect(html).toContain("+$79.80");
    expect(html).toContain("Quick Review");
    expect(html).toContain("Save Review");
    expect(html).toContain("review-tag-grid");
    expect(html).toContain("sequence-grid");
    expect((html.match(/sequence-card/g) || []).length).toBe(6);
    expect(html).toContain("context-grid");
    expect(html).toContain("execution-grid");
    expect(html).toContain(">Tight<");
    expect(html).not.toContain(">Marginal<");
    expect(html).toContain("review-note-field");
    expect(html).toContain('rows="5"');
    expect(html).toContain("grade-panel");
    expect(html).not.toContain("Automatic Grade");
    expect(html).toContain("review-evidence-grid");
    expect(html).toContain("Screenshots");
    expect(html).toContain("Loading screenshots...");
    expect(html).toContain("+ Add Screenshot");
    expect(html).toContain('multiple=""');
    expect(html).toContain("Order Breakdown");
    expect(html).toContain("Cancel");
    expect(html).not.toContain("Detailed Review");
    expect(html).not.toContain("Automatic Execution Summary");
    expect(html).not.toContain("Workflow Status");
  });

  it("provides empty, upload, preview, remove, multiple, and error screenshot states", () => {
    const source = readFileSync(new URL("./QuickReviewScreenshots.jsx", import.meta.url), "utf8");
    expect(source).toContain("No screenshot attached.");
    expect(source).toContain("+ Add Screenshot");
    expect(source).toContain("multiple");
    expect(source).toContain("setPreview(item)");
    expect(source).toContain("onRemove(item)");
    expect(source).toContain('role="alert"');
    expect(source).toContain("[...current, item]");
  });

  it("renders a different trade when selection changes", () => {
    const html = renderToStaticMarkup(
      <TradeReviewModal trade={trade({ id: "trade-2", ticker: "NVDA", direction: "Short", pnl: -25 })} reviews={[]} onClose={() => {}} />
    );
    expect(html).toContain("NVDA SHORT");
    expect(html).toContain("-$25.00");
    expect(html).not.toContain("AMD LONG");
  });
});
