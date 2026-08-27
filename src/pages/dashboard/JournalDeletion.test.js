import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Journal deletion guard", () => {
  it("keeps confirmation ahead of the delete call", () => {
    const source = readFileSync(new URL("./DashboardPage.jsx", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("const handleDeleteTrade"), source.indexOf("const handleUpdateTrade"));
    expect(handler.indexOf("window.confirm")).toBeGreaterThan(-1);
    expect(handler.indexOf("window.confirm")).toBeLessThan(handler.indexOf("await deleteTrade(tradeId)"));
    expect(handler).toContain("if (!confirmed) return");
  });
});
