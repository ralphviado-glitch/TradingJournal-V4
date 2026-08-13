import { afterEach, describe, expect, it } from "vitest";
import { calculateTradeExcursions } from "./excursionService";
import {
  MockMarketDataProvider,
  resetMarketDataProvider,
  setMarketDataProvider,
} from "./marketDataService";

afterEach(() => {
  resetMarketDataProvider();
});

describe("excursion service with mocked market data", () => {
  it("calculates long trade excursions through the provider flow", async () => {
    setMarketDataProvider(
      new MockMarketDataProvider([
        { timestamp: "2026-08-10 09:30:00", high: 102, low: 99.5 },
        { timestamp: "2026-08-10 09:31:00", high: 105, low: 100 },
      ])
    );

    await expect(
      calculateTradeExcursions({
        ticker: "NVDA",
        direction: "Long",
        date: "2026-08-10",
        entry_time: "09:30 AM",
        exit_time: "09:31 AM",
        entry_price: 100,
        actual_stop: 99,
        exit_price: 104,
        shares: 100,
      })
    ).resolves.toMatchObject({
      mfe_per_share: 5,
      mae_per_share: -0.5,
      mfe_dollars: 500,
      mae_dollars: -50,
      exit_efficiency: 80,
    });
  });

  it("calculates short trade excursions through the provider flow", async () => {
    setMarketDataProvider(
      new MockMarketDataProvider([
        { timestamp: "2026-08-10 09:30:00", high: 101, low: 98 },
        { timestamp: "2026-08-10 09:31:00", high: 99, low: 94 },
      ])
    );

    await expect(
      calculateTradeExcursions({
        ticker: "NVDA",
        direction: "Short",
        date: "2026-08-10",
        entry_time: "09:30 AM",
        exit_time: "09:31 AM",
        entry_price: 100,
        actual_stop: 102,
        exit_price: 95,
        shares: 100,
      })
    ).resolves.toMatchObject({
      mfe_per_share: 6,
      mae_per_share: -1,
      mfe_r: 3,
      mae_r: -0.5,
      exit_efficiency: 83.3,
    });
  });
});
