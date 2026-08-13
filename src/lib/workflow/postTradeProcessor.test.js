import { describe, expect, it } from "vitest";
import { getManagementEnrichment, processImportedTrade, processImportedTrades } from "./postTradeProcessor";

const trade = { id: "t1", trade_date: "2026-08-11", ticker: "NVDA", direction: "Long", entry_price: 10, shares: 100, orders: [{ side: "Buy", quantity: 100, price: 10, timestamp: 1 }, { side: "Sell", quantity: 80, price: 11, timestamp: 2 }, { side: "Sell", quantity: 20, price: 13, timestamp: 3 }] };
const watchlist = [{ id: "w1", trade_date: "2026-08-11", ticker: "NVDA", direction: "Long", priority: 1 }];
const updateTrade = async (id, updates) => ({ ...trade, id, ...updates });

describe("post-trade processing", () => {
  it("enriches excursions, management, matching, and status successfully", async () => {
    const result = await processImportedTrade(trade, watchlist, { updateTrade, calculateExcursions: async () => ({ mfe_r: 2, exit_efficiency: 70 }) });
    expect(result.statuses).toMatchObject({ processing: "Complete", excursion: "Calculated", management: "Derived", watchlist: "Matched" });
    expect(result.trade).toMatchObject({ first_scale_shares: 80, watchlist_item_id: "w1" });
  });
  it("does not fail import when excursion calculation fails", async () => {
    const result = await processImportedTrade(trade, [], { updateTrade, calculateExcursions: async () => { throw new Error("provider down"); } });
    expect(result.statuses).toMatchObject({ processing: "Partial", excursion: "Failed" }); expect(result.trade.id).toBe("t1");
  });
  it("marks rate limits unavailable without retrying", async () => {
    const result = await processImportedTrade(trade, [], { updateTrade, calculateExcursions: async () => { throw new Error("429 rate limit"); } });
    expect(result.statuses.excursion).toBe("Unavailable");
  });
  it("handles management derivation and no-scale-out cases", () => {
    expect(getManagementEnrichment(trade).management_status).toBe("Derived");
    expect(getManagementEnrichment({ ...trade, orders: [trade.orders[0], { side: "Sell", quantity: 100, price: 11 }] }).management_status).toBe("Not Applicable");
  });
  it("returns processing summaries and isolates persistence failures", async () => {
    const result = await processImportedTrades([trade, { ...trade, id: "t2" }], { getWatchlistForDates: async () => watchlist, calculateExcursions: async () => ({}), updateTrade: async (id, updates) => { if (id === "t2") throw new Error("save failed"); return { ...trade, ...updates }; } });
    expect(result.summary).toMatchObject({ excursionsCalculated: 1, scaleOutsDetected: 1, watchlistMatches: 1 });
    expect(result.results[1].statuses.processing).toBe("Failed");
  });
});
