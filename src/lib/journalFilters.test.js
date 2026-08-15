import { describe, expect, it } from "vitest";
import { emptyJournalFilters, filterJournalTrades } from "./journalFilters";

const trades = [{ ticker: "AMD", setup: "Break", date: "2026-08-01", pnl: 10 }, { ticker: "SNDK", setup: "Fade", date: "2026-08-02", net_pnl: -5, pnl: 10 }];
describe("Journal filters", () => {
  it("matches partial ticker text case-insensitively and authoritative results", () => {
    expect(filterJournalTrades(trades, { ...emptyJournalFilters, ticker: "m" })).toHaveLength(1);
    expect(filterJournalTrades(trades, { ...emptyJournalFilters, result: "LOSS" })[0].ticker).toBe("SNDK");
  });
  it("the reset state restores all trades", () => expect(filterJournalTrades(trades, emptyJournalFilters)).toHaveLength(2));
});
