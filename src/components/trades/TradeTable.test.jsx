import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TradeTable from "./TradeTable";

const trade = { id:"trade-1", date:"2026-08-27", ticker:"AMD", direction:"Long", pnl:42, entry_price:100, exit_price:101, shares:42, setup:"Breakout" };

describe("Journal TradeTable actions and responsive layout", () => {
  it("renders accessible SVG actions for the correct trade and preserves legacy detail editing", () => {
    const html = renderToStaticMarkup(<TradeTable trades={[trade]} onSelectTrade={vi.fn()} onDeleteTrade={vi.fn()} onUpdateTrade={vi.fn()} />);
    const desktop = html.slice(0, html.indexOf('<div class="trade-card-list">'));
    expect(html).toContain('aria-label="View AMD trade"');
    expect(html).toContain('aria-label="Delete AMD trade"');
    expect(html).toContain('aria-label="Edit AMD trade details"');
    expect(html).toContain("<svg");
    expect(desktop).not.toContain(">View</button>");
    expect(desktop).not.toContain(">Delete</button>");
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
