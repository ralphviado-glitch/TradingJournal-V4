import { describe, expect, it } from "vitest";
import {
  buildTwelveDataUrl,
  formatTwelveDataDateTime,
  normalizeTwelveDataResponse,
  validateMarketDataRequest,
} from "../../supabase/functions/market-data/marketData";

describe("Twelve Data market-data adapter", () => {
  const validRequest = {
    ticker: "nvda",
    interval: "1min",
    startTime: "2026-08-10T13:30:00.000Z",
    endTime: "2026-08-10T13:35:00.000Z",
  };

  it("validates requests and converts UTC RFC3339 to New York Twelve Data timestamps", () => {
    const request = validateMarketDataRequest(validRequest);

    expect(request.ticker).toBe("NVDA");
    expect(request.startDate).toBe("2026-08-10T09:30:00");
    expect(request.endDate).toBe("2026-08-10T09:35:00");
  });

  it("handles daylight saving time and standard time conversion", () => {
    expect(formatTwelveDataDateTime("2026-08-10T13:30:00.000Z")).toBe(
      "2026-08-10T09:30:00"
    );
    expect(formatTwelveDataDateTime("2026-01-12T14:30:00.000Z")).toBe(
      "2026-01-12T09:30:00"
    );
  });

  it("builds the official time_series URL without arbitrary upstream input", () => {
    const request = validateMarketDataRequest(validRequest);
    const url = buildTwelveDataUrl(request, "server-secret");

    expect(url.origin).toBe("https://api.twelvedata.com");
    expect(url.pathname).toBe("/time_series");
    expect(url.searchParams.get("symbol")).toBe("NVDA");
    expect(url.searchParams.get("interval")).toBe("1min");
    expect(url.searchParams.get("timezone")).toBe("America/New_York");
    expect(url.searchParams.get("order")).toBe("asc");
    expect(url.searchParams.get("apikey")).toBe("server-secret");
  });

  it("normalizes string OHLC values and sorts candles chronologically", () => {
    const candles = normalizeTwelveDataResponse({
      status: "ok",
      values: [
        {
          datetime: "2026-08-10 09:32:00",
          open: "102.00",
          high: "103.25",
          low: "101.50",
          close: "102.75",
          volume: "1000",
        },
        {
          datetime: "2026-08-10 09:31:00",
          open: "101.00",
          high: "102.25",
          low: "100.50",
          close: "101.75",
          volume: "900",
        },
      ],
    });

    expect(candles).toEqual([
      {
        timestamp: "2026-08-10 09:31:00",
        open: 101,
        high: 102.25,
        low: 100.5,
        close: 101.75,
        volume: 900,
      },
      {
        timestamp: "2026-08-10 09:32:00",
        open: 102,
        high: 103.25,
        low: 101.5,
        close: 102.75,
        volume: 1000,
      },
    ]);
  });

  it("rejects malformed candles and empty values", () => {
    expect(() => normalizeTwelveDataResponse({ status: "ok", values: [] })).toThrow(
      "No candles returned."
    );
    expect(() =>
      normalizeTwelveDataResponse({
        status: "ok",
        values: [{ datetime: "2026-08-10 09:31:00", high: "bad" }],
      })
    ).toThrow("Malformed candle.");
  });

  it("maps Twelve Data API errors and rate limits safely", () => {
    expect(() =>
      normalizeTwelveDataResponse({
        status: "error",
        code: 400,
        message: "Invalid API key",
      })
    ).toThrow("Upstream market data error.");

    expect(() =>
      normalizeTwelveDataResponse({
        status: "error",
        code: 429,
        message: "rate limit exceeded",
      })
    ).toThrow("Rate limited.");
  });

  it("rejects unsafe symbols, unsupported intervals, invalid timestamps, and large ranges", () => {
    expect(() => validateMarketDataRequest({ ...validRequest, ticker: "../AAPL" })).toThrow(
      "Invalid ticker."
    );
    expect(() => validateMarketDataRequest({ ...validRequest, interval: "5min" })).toThrow(
      "Unsupported interval."
    );
    expect(() => validateMarketDataRequest({ ...validRequest, startTime: "2026-08-10 09:30" })).toThrow(
      "Invalid timestamps."
    );
    expect(() =>
      validateMarketDataRequest({
        ...validRequest,
        endTime: "2026-08-11T13:35:00.000Z",
      })
    ).toThrow("Market data window is too large.");
  });
});
