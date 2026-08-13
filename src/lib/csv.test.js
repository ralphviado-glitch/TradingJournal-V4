import { describe, expect, it } from "vitest";
import { normalizeBrokerOrders, parseTradesFromRows } from "./csv";
import { matchTradeToWatchlist } from "./workflow/watchlistMatcher";

function order({ time, symbol = "NVDA", side, quantity, price, event = "Filled" }) {
  const utcDate = new Date(`2026-04-29T${time}Z`);
  if (Number.isNaN(utcDate.getTime())) {
    return { "Date/Time": time, Symbol: symbol, Side: side, Quantity: quantity, Price: price, Event: event };
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Pacific/Auckland", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(utcDate).map((part) => [part.type, part.value]));
  return {
    "Date/Time": `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`,
    Symbol: symbol,
    Side: side,
    Quantity: quantity,
    Price: price,
    Event: event,
  };
}

function sourceOrder(dateTime, side, quantity, price) {
  return { "Date/Time": dateTime, Symbol: "NVDA", Side: side, Quantity: quantity, Price: price, Event: "Filled" };
}

describe("CSV trade reconstruction", () => {
  it("reconstructs a basic long trade", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "14:00:00", side: "Sell", quantity: 100, price: 12 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      ticker: "NVDA",
      direction: "Long",
      entry_price: 10,
      exit_price: 12,
      shares: 100,
      pnl: 200,
    });
  });

  it("reconstructs a basic short trade", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Sell", quantity: 100, price: 20 }),
      order({ time: "14:00:00", side: "Buy", quantity: 100, price: 18 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      direction: "Short",
      entry_price: 20,
      exit_price: 18,
      shares: 100,
      pnl: 200,
    });
  });

  it("scales into a long trade with weighted average entry", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 50, price: 10 }),
      order({ time: "13:45:00", side: "Buy", quantity: 50, price: 12 }),
      order({ time: "14:00:00", side: "Sell", quantity: 100, price: 13 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0].entry_price).toBe(11);
    expect(trades[0].exit_price).toBe(13);
    expect(trades[0].shares).toBe(100);
    expect(trades[0].pnl).toBe(200);
  });

  it("scales out with weighted exit and realized P&L", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "13:45:00", side: "Sell", quantity: 80, price: 11 }),
      order({ time: "14:00:00", side: "Sell", quantity: 20, price: 13 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0].exit_price).toBe(11.4);
    expect(trades[0].pnl).toBe(140);
  });

  it("creates separate completed trades for the same ticker on the same day", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "14:00:00", side: "Sell", quantity: 100, price: 11 }),
      order({ time: "15:00:00", side: "Buy", quantity: 100, price: 20 }),
      order({ time: "16:00:00", side: "Sell", quantity: 100, price: 19 }),
    ]);

    expect(trades).toHaveLength(2);
    expect(trades[0].pnl).toBe(100);
    expect(trades[1].pnl).toBe(-100);
  });

  it("splits a position reversal into a completed trade and a new open position", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "14:00:00", side: "Sell", quantity: 150, price: 12 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      direction: "Long",
      shares: 100,
      exit_price: 12,
      pnl: 200,
    });
  });

  it("does not emit incomplete open trades", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
    ]);

    expect(trades).toEqual([]);
  });

  it("filters bad or invalid broker rows", () => {
    const orders = normalizeBrokerOrders([
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "13:31:00", symbol: "", side: "Buy", quantity: 100, price: 10 }),
      order({ time: "bad-time", side: "Sell", quantity: 100, price: 11 }),
      order({ time: "13:32:00", side: "Sell", quantity: "", price: 11 }),
      order({ time: "13:33:00", side: "Sell", quantity: 100, price: "" }),
      order({ time: "13:34:00", side: "Sell", quantity: 100, price: 11, event: "Cancelled" }),
    ]);

    expect(orders).toHaveLength(1);
  });

  it("sorts orders chronologically before reconstruction", () => {
    const trades = parseTradesFromRows([
      order({ time: "14:00:00", side: "Sell", quantity: 100, price: 12 }),
      order({ time: "13:30:00", side: "Buy", quantity: 100, price: 10 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0].pnl).toBe(200);
  });

  it("supports decimal prices and quantities", () => {
    const trades = parseTradesFromRows([
      order({ time: "13:30:00", side: "Buy", quantity: 10.5, price: 100.25 }),
      order({ time: "14:00:00", side: "Sell", quantity: 10.5, price: 101.75 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0].shares).toBe(10.5);
    expect(trades[0].pnl).toBe(15.75);
  });

  it("normalizes and reconstructs multiple Auckland fills on the previous New York trading date", () => {
    const trades = parseTradesFromRows([
      sourceOrder("12.08.2026 02:08:00", "Buy", 25, 217),
      sourceOrder("12.08.2026 01:46:00", "Sell", 100, 220.07),
      sourceOrder("12.08.2026 01:58:00", "Buy", 25, 218),
      sourceOrder("12.08.2026 01:52:00", "Buy", 50, 219),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      date: "2026-08-11", direction: "Short", entry_time: "09:46 AM", exit_time: "10:08 AM",
    });
    expect(trades[0].orders.map((fill) => fill.time)).toEqual(["09:46 AM", "09:52 AM", "09:58 AM", "10:08 AM"]);
    expect(trades[0].orders.map((fill) => fill.timestampUtc)).toEqual([
      "2026-08-11T13:46:00.000Z", "2026-08-11T13:52:00.000Z",
      "2026-08-11T13:58:00.000Z", "2026-08-11T14:08:00.000Z",
    ]);
    expect(trades[0].orders.every((fill) => fill.date === "2026-08-11")).toBe(true);
    expect(trades[0].orders.map((fill) => fill.timestamp)).toEqual(
      [...trades[0].orders].map((fill) => fill.timestamp).sort((a, b) => a - b)
    );
    expect(matchTradeToWatchlist(trades[0], [
      { id: "aug-11", trade_date: "2026-08-11", ticker: "NVDA", direction: "Short" },
      { id: "aug-12", trade_date: "2026-08-12", ticker: "NVDA", direction: "Short" },
    ]).payload.watchlist_item_id).toBe("aug-11");
  });
});
