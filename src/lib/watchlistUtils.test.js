import { describe, expect, it } from "vitest";
import {
  getAvailableWatchlistLevels,
  parseNullablePrice,
  sortWatchlistByPriority,
} from "./watchlistUtils";

describe("watchlist ordering", () => {
  it("sorts watchlist rows by ascending priority", () => {
    const sorted = sortWatchlistByPriority([
      { ticker: "TSLA", priority: 3 },
      { ticker: "NVDA", priority: 1 },
      { ticker: "AAPL", priority: 2 },
    ]);

    expect(sorted.map((item) => item.ticker)).toEqual(["NVDA", "AAPL", "TSLA"]);
  });

  it("uses created_at as secondary ordering when priority matches", () => {
    const sorted = sortWatchlistByPriority([
      { ticker: "B", priority: 1, created_at: "2026-08-10T12:00:00Z" },
      { ticker: "A", priority: 1, created_at: "2026-08-10T10:00:00Z" },
    ]);

    expect(sorted.map((item) => item.ticker)).toEqual(["A", "B"]);
  });

  it("keeps nullable structured levels out of the display list", () => {
    expect(
      getAvailableWatchlistLevels({
        pmh: 184.5,
        pml: null,
        pdh: "",
        major_support: 181,
      })
    ).toEqual([["Major Support", 181]]);
  });

  it("parses nullable price inputs safely", () => {
    expect(parseNullablePrice("184.50")).toBe(184.5);
    expect(parseNullablePrice("")).toBeNull();
    expect(parseNullablePrice("bad")).toBeNull();
  });
});
