import { describe, expect, it, vi } from "vitest";
import {
  buildTradeMarketDataRequest,
  getTimeZoneOffsetMs,
  marketDateTimeToUtcIso,
  parseTradeThePoolTimestamp,
  tradeThePoolTimestampToNewYork,
  tradeThePoolTimestampToUtc,
} from "./marketTime";

describe("US market time conversion", () => {
  it("converts summer New York market time using daylight saving time", () => {
    expect(marketDateTimeToUtcIso("2026-08-10", "09:30 AM")).toBe(
      "2026-08-10T13:30:00.000Z"
    );
  });

  it("converts winter New York market time using standard time", () => {
    expect(marketDateTimeToUtcIso("2026-01-12", "09:30 AM")).toBe(
      "2026-01-12T14:30:00.000Z"
    );
  });

  it("floors seconds to the 1-minute bar", () => {
    expect(marketDateTimeToUtcIso("2026-08-10", "09:30:45 AM")).toBe(
      "2026-08-10T13:30:00.000Z"
    );
  });

  it("includes the entry and exit minute in market data requests", () => {
    const request = buildTradeMarketDataRequest({
      ticker: "NVDA",
      date: "2026-08-10",
      entry_time: "09:30:45 AM",
      exit_time: "09:35:05 AM",
    });

    expect(request).toEqual({
      ticker: "NVDA",
      startTime: "2026-08-10T13:30:00.000Z",
      endTime: "2026-08-10T13:35:00.000Z",
      interval: "1min",
    });
  });

  it("expands same-minute trades to a valid one-minute request window", () => {
    const request = buildTradeMarketDataRequest({
      ticker: "NVDA",
      date: "2026-08-10",
      entry_time: "09:30 AM",
      exit_time: "09:30 AM",
    });

    expect(request.startTime).toBe("2026-08-10T13:30:00.000Z");
    expect(request.endTime).toBe("2026-08-10T13:31:00.000Z");
  });

  it("detects different New York UTC offsets around DST", () => {
    expect(getTimeZoneOffsetMs(new Date("2026-08-10T13:30:00.000Z"))).toBe(
      -4 * 60 * 60 * 1000
    );
    expect(getTimeZoneOffsetMs(new Date("2026-01-12T14:30:00.000Z"))).toBe(
      -5 * 60 * 60 * 1000
    );
  });
});

describe("Trade The Pool Auckland timestamp normalization", () => {
  it("parses DD.MM.YYYY explicitly and converts the exact regression timestamp", () => {
    expect(parseTradeThePoolTimestamp("12.08.2026 01:46:00")).toEqual({
      year: 2026, month: 8, day: 12, hour: 1, minute: 46, second: 0,
    });
    expect(tradeThePoolTimestampToUtc("12.08.2026 01:46:00")).toBe("2026-08-11T13:46:00.000Z");
    expect(tradeThePoolTimestampToNewYork("12.08.2026 01:46:00")).toMatchObject({
      date: "2026-08-11", time: "09:46 AM", timestampUtc: "2026-08-11T13:46:00.000Z",
    });
  });

  it("rejects guessed, invalid, and ambiguous date formats", () => {
    expect(parseTradeThePoolTimestamp("2026-08-12T01:46:00")).toBeNull();
    expect(parseTradeThePoolTimestamp("12/08/2026 01:46:00")).toBeNull();
    expect(parseTradeThePoolTimestamp("31.02.2026 01:46:00")).toBeNull();
  });

  it.each([
    ["14.01.2026 03:30:00", "2026-01-13T14:30:00.000Z", "2026-01-13", "09:30 AM"],
    ["16.06.2026 01:30:00", "2026-06-15T13:30:00.000Z", "2026-06-15", "09:30 AM"],
    ["01.04.2026 02:30:00", "2026-03-31T13:30:00.000Z", "2026-03-31", "09:30 AM"],
  ])("uses IANA DST rules for %s", (raw, utc, date, time) => {
    expect(tradeThePoolTimestampToUtc(raw)).toBe(utc);
    expect(tradeThePoolTimestampToNewYork(raw)).toMatchObject({ date, time });
  });

  it("is independent of the process/browser timezone", () => {
    const localOffset = vi.spyOn(Date.prototype, "getTimezoneOffset").mockImplementation(() => {
      throw new Error("Browser-local timezone must not be consulted");
    });
    try {
      expect(tradeThePoolTimestampToNewYork("12.08.2026 01:46:00")).toMatchObject({
        date: "2026-08-11", time: "09:46 AM",
      });
      expect(localOffset).not.toHaveBeenCalled();
    } finally {
      localOffset.mockRestore();
    }
  });

  it("builds the Twelve Data window from normalized New York fields without double conversion", () => {
    const normalized = tradeThePoolTimestampToNewYork("12.08.2026 01:46:00");
    expect(buildTradeMarketDataRequest({
      ticker: "NVDA", date: normalized.date, entry_time: normalized.time, exit_time: "10:08 AM",
    })).toEqual({
      ticker: "NVDA", startTime: "2026-08-11T13:46:00.000Z", endTime: "2026-08-11T14:08:00.000Z", interval: "1min",
    });
  });
});
