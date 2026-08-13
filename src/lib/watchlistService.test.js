import { describe, expect, it } from "vitest";
import { buildWatchlistPayload, buildWatchlistUpdatePayload } from "./watchlistService";

describe("watchlist service payloads", () => {
  it("includes structured nullable fields in create payloads", () => {
    expect(
      buildWatchlistPayload(
        {
          trade_date: "2026-08-10",
          ticker: "nvda",
          direction: "Long",
          priority: "1",
          setup: "Break & Retest",
          pmh: "184.50",
          pml: "",
          atr: "6.25",
          long_scenario_enabled: true,
          long_trigger: "Hold 184",
          short_scenario_enabled: false,
          bottom_line: "Prefer long",
        },
        "user-1"
      )
    ).toMatchObject({
      user_id: "user-1",
      ticker: "NVDA",
      pmh: 184.5,
      pml: null,
      atr: 6.25,
      long_scenario_enabled: true,
      long_trigger: "Hold 184",
      short_scenario_enabled: false,
      bottom_line: "Prefer long",
    });
  });

  it("includes structured fields in update payloads", () => {
    expect(
      buildWatchlistUpdatePayload({
        ticker: "tsla",
        priority: "2",
        major_resistance: "187.50",
        major_support: "",
        notes: "Watching retest",
        short_scenario_enabled: true,
        short_target: "180",
      })
    ).toMatchObject({
      ticker: "TSLA",
      priority: 2,
      major_resistance: 187.5,
      major_support: null,
      notes: "Watching retest",
      short_scenario_enabled: true,
      short_target: "180",
    });
  });
});
