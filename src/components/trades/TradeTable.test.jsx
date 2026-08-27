import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TradeTable from "./TradeTable";
import { formatJournalPrice, journalReviewLabel, journalReviewStatus } from "../../lib/journalPresentation";

const trade = { id:"trade-1", date:"2026-08-27", ticker:"AMD", direction:"Long", pnl:42, entry_price:100, exit_price:101, shares:42, setup:"Breakout" };

describe("Journal TradeTable actions and responsive layout", () => {
  it("renders only accessible View and Delete SVG actions for the correct trade", () => {
    const html = renderToStaticMarkup(<TradeTable trades={[trade]} onSelectTrade={vi.fn()} onDeleteTrade={vi.fn()} onUpdateTrade={vi.fn()} />);
    const desktop = html.slice(0, html.indexOf('<div class="trade-card-list">'));
    expect(html).toContain('aria-label="View AMD trade"');
    expect(html).toContain('aria-label="Delete AMD trade"');
    expect(html).not.toContain('aria-label="Edit AMD trade details"');
    expect(html).not.toContain(">Edit</button>");
    expect(html).toContain("<svg");
    expect(desktop).not.toContain(">View</button>");
    expect(desktop).not.toContain(">Delete</button>");
  });

  it("formats prices without mutating underlying values", () => {
    const precise = { ...trade, entry_price:223.135, exit_price:219.31600000000003 };
    const html = renderToStaticMarkup(<TradeTable trades={[precise]} onSelectTrade={vi.fn()} onDeleteTrade={vi.fn()} onUpdateTrade={vi.fn()} />);
    expect(html).toContain(">223.14</td>");
    expect(html).toContain(">219.32</td>");
    expect(formatJournalPrice(499.5)).toBe("499.50");
    expect(formatJournalPrice(1781)).toBe("1781.00");
    expect(precise.entry_price).toBe(223.135);
    expect(precise.exit_price).toBe(219.31600000000003);
  });

  it.each([["Reviewed","Yes"],["Review Complete","Yes"],["Not Reviewed","No"],["Partially Reviewed","Partial"],["In Progress","Partial"]])("maps %s to %s for display only", (stored, displayed) => {
    expect(journalReviewLabel(stored)).toBe(displayed);
    expect(stored).not.toBe(displayed);
  });

  it("honors persisted in-progress labels without changing them", () => {
    const persisted = { review_status:"In Progress" };
    expect(journalReviewStatus(persisted,"Not Reviewed")).toBe("In Progress");
    expect(persisted.review_status).toBe("In Progress");
  });

  it("aligns the Net P&L header and value as numeric cells", () => {
    const html = renderToStaticMarkup(<TradeTable trades={[trade]} onSelectTrade={vi.fn()} onDeleteTrade={vi.fn()} onUpdateTrade={vi.fn()} />);
    expect(html).toContain('<th class="numeric">Net P&amp;L</th>');
    expect(html).toMatch(/<td class="numeric result-win">\$42\.00<\/td>/);
  });

  it("uses a fitted desktop table and the existing mobile card presentation", () => {
    const css = readFileSync(new URL("../../styles/index.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.trade-table-wrapper\s*\{[^}]*width:\s*100%[^}]*overflow:\s*visible/s);
    expect(css).toMatch(/\.trade-table\s*\{[^}]*min-width:\s*0[^}]*table-layout:\s*fixed/s);
    expect(css).not.toMatch(/\.trade-table\s*\{[^}]*min-width:\s*980px/s);
    expect(css).toMatch(/\.trade-table-wrapper\s*\{\s*display:\s*none;/);
    expect(css).toMatch(/\.trade-card-list\s*\{\s*display:\s*grid;/);
  });
});
