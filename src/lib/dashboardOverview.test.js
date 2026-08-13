import { describe, expect, it } from "vitest";
import { getRecentTrades } from "./dashboardOverview";

describe("dashboard recent-trades preview", () => {
  it("shows at most the latest five trades", () => {
    const trades = Array.from({ length: 7 }, (_, index) => ({ id: String(index + 1), trade_date: `2026-08-${String(index + 1).padStart(2, "0")}` }));
    expect(getRecentTrades(trades).map((trade) => trade.id)).toEqual(["7", "6", "5", "4", "3"]);
  });

  it("does not mutate the Journal's full trade collection", () => {
    const trades = [{ id: "old", trade_date: "2026-08-01" }, { id: "new", trade_date: "2026-08-02" }];
    getRecentTrades(trades, 1);
    expect(trades.map((trade) => trade.id)).toEqual(["old", "new"]);
  });
});
