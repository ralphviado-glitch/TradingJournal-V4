import { afterEach, describe, expect, it } from "vitest";
import {
  calculateExcursionsFromCandles,
  getRiskPerShare,
  getTradeDirection,
  normalizeCandles,
} from "./excursionEngine";
import {
  getIntradayCandles,
  MockMarketDataProvider,
  resetMarketDataProvider,
  setMarketDataProvider,
} from "./marketDataService";

afterEach(() => {
  resetMarketDataProvider();
});

describe("excursion engine", () => {
  it("calculates a winning long trade", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        entry_price: 100,
        actual_stop: 99,
        exit_price: 104,
        shares: 100,
      },
      [
        { timestamp: "2026-08-10T13:30:00-04:00", high: 102, low: 99.5 },
        { timestamp: "2026-08-10T13:31:00-04:00", high: 105, low: 100.5 },
      ]
    );

    expect(result.mfe_per_share).toBe(5);
    expect(result.mae_per_share).toBe(-0.5);
    expect(result.mfe_dollars).toBe(500);
    expect(result.mae_dollars).toBe(-50);
    expect(result.mfe_r).toBe(5);
    expect(result.mae_r).toBe(-0.5);
    expect(result.exit_efficiency).toBe(80);
    expect(result.highest_price_during_trade).toBe(105);
    expect(result.lowest_price_during_trade).toBe(99.5);
  });

  it("calculates the reported long trade MFE and MAE from highest and lowest candles", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        entry_price: 433.88,
        exit_price: 434.76,
        shares: 100,
      },
      [
        {
          timestamp: "2026-08-10T13:30:00Z",
          high: 435.75,
          low: 433.53,
        },
      ]
    );

    expect(result.mfe_per_share).toBe(1.87);
    expect(result.mae_per_share).toBe(-0.35);
    expect(result.highest_price_during_trade).toBe(435.75);
    expect(result.lowest_price_during_trade).toBe(433.53);
  });

  it("normalizes only explicit short direction as short", () => {
    expect(getTradeDirection({ direction: "Long" })).toBe("Long");
    expect(getTradeDirection({ direction: " long " })).toBe("Long");
    expect(getTradeDirection({ direction: "SHORT" })).toBe("Short");
  });

  it("calculates a losing long trade and clamps exit efficiency", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        actual_entry: 100,
        actual_stop: 99,
        actual_exit: 98,
        shares: 100,
      },
      [{ timestamp: "2026-08-10T13:30:00Z", high: 101, low: 97 }]
    );

    expect(result.mfe_per_share).toBe(1);
    expect(result.mae_per_share).toBe(-3);
    expect(result.exit_efficiency).toBe(0);
  });

  it("keeps long adverse excursion at zero when price never moves below entry", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        actual_entry: 100,
        actual_stop: 99,
        actual_exit: 102,
        shares: 50,
      },
      [{ timestamp: "2026-08-10T13:30:00Z", high: 103, low: 100 }]
    );

    expect(result.mae_per_share).toBe(0);
    expect(result.mae_dollars).toBe(0);
  });

  it("calculates a winning short trade", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Short",
        entry_price: 100,
        actual_stop: 102,
        exit_price: 95,
        shares: 100,
      },
      [
        { timestamp: "2026-08-10T13:30:00Z", high: 101, low: 98 },
        { timestamp: "2026-08-10T13:31:00Z", high: 99, low: 94 },
      ]
    );

    expect(result.mfe_per_share).toBe(6);
    expect(result.mae_per_share).toBe(-1);
    expect(result.mfe_dollars).toBe(600);
    expect(result.mae_dollars).toBe(-100);
    expect(result.mfe_r).toBe(3);
    expect(result.mae_r).toBe(-0.5);
    expect(result.exit_efficiency).toBe(83.3);
  });

  it("ignores stale manual actual entry and exit when imported execution prices exist", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        entry_price: 433,
        exit_price: 436,
        actual_entry: 101,
        actual_exit: 99,
        actual_stop: 432,
        shares: 10,
      },
      [
        { timestamp: "2026-08-10T13:30:00Z", high: 435, low: 432.5 },
        { timestamp: "2026-08-10T13:31:00Z", high: 437, low: 434 },
      ]
    );

    expect(result.mfe_per_share).toBe(4);
    expect(result.mae_per_share).toBe(-0.5);
    expect(result.mfe_dollars).toBe(40);
    expect(result.mae_dollars).toBe(-5);
    expect(result.mfe_r).toBe(4);
    expect(result.mae_r).toBe(-0.5);
    expect(result.exit_efficiency).toBe(75);
    expect(result.actual_risk).toBe(10);
  });

  it("rejects returned candles that are incompatible with the imported entry price", () => {
    expect(() =>
      calculateExcursionsFromCandles(
        {
          direction: "Long",
          entry_price: 433,
          exit_price: 434,
          actual_entry: 101,
          shares: 10,
        },
        [
          { timestamp: "2026-08-10T13:30:00Z", high: 102, low: 100 },
          { timestamp: "2026-08-10T13:31:00Z", high: 103, low: 101 },
        ]
      )
    ).toThrow(
      "Market data does not align with the imported trade price. Check ticker and trade timestamps."
    );
  });

  it("calculates a losing short trade", () => {
    const result = calculateExcursionsFromCandles(
      {
        direction: "Short",
        actual_entry: 100,
        actual_stop: 102,
        actual_exit: 103,
        shares: 100,
      },
      [{ timestamp: "2026-08-10T13:30:00Z", high: 103, low: 99 }]
    );

    expect(result.mfe_per_share).toBe(1);
    expect(result.mae_per_share).toBe(-3);
    expect(result.exit_efficiency).toBe(0);
  });

  it("uses planned stop or existing risk when actual stop is missing", () => {
    expect(getRiskPerShare({ planned_entry: 50, planned_stop: 48 })).toBe(2);
    expect(getRiskPerShare({ risk: 1.5 })).toBe(1.5);

    const result = calculateExcursionsFromCandles(
      {
        direction: "Long",
        entry_price: 50,
        exit_price: 53,
        shares: 10,
      },
      [{ timestamp: "2026-08-10T13:30:00Z", high: 54, low: 49 }]
    );

    expect(result.mfe_r).toBeNull();
    expect(result.mae_r).toBeNull();
    expect(result.actual_risk).toBeUndefined();
  });

  it("throws for invalid candles", () => {
    expect(() =>
      calculateExcursionsFromCandles(
        { direction: "Long", actual_entry: 10, shares: 10 },
        [{ timestamp: "2026-08-10T13:30:00Z", high: "bad", low: null }]
      )
    ).toThrow("Valid trade details and intraday candles are required.");
  });

  it("preserves timezone-aware candle timestamps while normalizing prices", () => {
    const [candle] = normalizeCandles([
      { timestamp: "2026-08-10T09:30:00-04:00", high: "101.25", low: "99.75" },
    ]);

    expect(candle.timestamp).toBe("2026-08-10T09:30:00-04:00");
    expect(candle.high).toBe(101.25);
    expect(candle.low).toBe(99.75);
  });

  it("supports a mock provider for tests and future adapters", async () => {
    setMarketDataProvider(
      new MockMarketDataProvider([
        { timestamp: "2026-08-10T13:30:00Z", high: 10, low: 9 },
      ])
    );

    await expect(getIntradayCandles({ ticker: "NVDA" })).resolves.toEqual([
      { timestamp: "2026-08-10T13:30:00Z", high: 10, low: 9 },
    ]);
  });
});
