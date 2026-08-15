import { describe, expect, it } from "vitest";
import { normalizeBrokerOrders, parseTradesFromRows } from "./csv";
import { mapTradeToInsertRow } from "./tradeService";
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
  it("selects the coherent account, recovers notional price, and excludes its open position", () => {
    const row = (account, time, symbol, side, quantity, price, extra = {}) => ({ ...order({ time, symbol, side, quantity, price }), Account: account, Login: "LOGIN-A", ...extra });
    const canonical = [
      row("FLEX5013084227", "13:30:00", "SNDK", "Buy", 5, 1634.56), row("FLEX5013084227", "13:31:00", "SNDK", "Sell", 5, 1615.34),
      row("FLEX5013084227", "13:40:00", "AMD", "Buy", 50, 498.96), row("FLEX5013084227", "13:40:00", "AMD", "Sell", 100, 496.57), row("FLEX5013084227", "13:40:00", "AMD", "Buy", 50, 499.59),
      row("FLEX5013084227", "13:50:00", "AMD", "Buy", 100, 499.5), row("FLEX5013084227", "13:51:00", "AMD", "Sell", 80, 501.78),
      row("FLEX5013084227", "13:52:00", "AMD", "Sell", 10, 504.01), row("FLEX5013084227", "13:53:00", "AMD", "Sell", 5, 509.93),
      row("FLEX5013084227", "13:54:00", "AMD", "Sell", 5, "", { Bought: "2,513.70 USD" }), row("FLEX5013084227", "14:00:00", "AMD", "Buy", 50, 509.57),
    ];
    const mirrored = [row("MIRROR", "13:30:00", "SNDK", "Buy", 5, 1634.56), row("MIRROR", "13:31:00", "SNDK", "Sell", 5, 1615.34)];
    const trades = parseTradesFromRows([...canonical, ...mirrored], { preferredAccount: "  FLEX5013084227  " });
    expect(trades.diagnostics).toMatchObject({ accountCount: 2, canonicalAccount: "FLEX5013084227", selectionMethod: "Preferred Account", completedTrades: 3, incompletePositions: 1, inferredPrices: 1 });
    expect(trades).toHaveLength(3);
    expect(trades.filter((trade) => trade.ticker === "AMD" && trade.direction === "Short")).toHaveLength(0);
    expect(trades.map((trade) => trade.shares)).toEqual([5, 100, 100]);
    expect(trades[1].entry_price).toBeCloseTo(499.275, 3);
    expect(trades[2].exit_price).toBeCloseTo(502.4585, 4);
    expect(trades[2].orders.at(-1)).toMatchObject({ price: 502.74, priceInferred: true });
    expect(trades.diagnostics.reconstructionDiagnostics.AMD.slice(0, 3).map(({ beforePosition, afterPosition, tradeAction }) => ({ beforePosition, afterPosition, tradeAction }))).toEqual([
      { beforePosition: 0, afterPosition: 50, tradeAction: "OPEN_LONG" },
      { beforePosition: 50, afterPosition: 100, tradeAction: "ADD_LONG" },
      { beforePosition: 100, afterPosition: 0, tradeAction: "CLOSE_LONG" },
    ]);
    const persisted = trades.map((trade) => mapTradeToInsertRow(trade, "user-1"));
    expect(persisted).toHaveLength(3);
    expect(persisted.map((trade) => trade.shares)).toEqual([5, 100, 100]);
    expect(trades.flatMap((trade) => trade.orders).every((fill) => fill.account === "FLEX5013084227")).toBe(true);
  });

  it("blocks rather than falling back when the preferred account is missing", () => {
    const rows = [
      { ...order({ time: "13:30:00", side: "Buy", quantity: 10, price: 10 }), Account: "AVAILABLE", Login: "L" },
      { ...order({ time: "13:31:00", side: "Sell", quantity: 10, price: 11 }), Account: "AVAILABLE", Login: "L" },
    ];
    const trades = parseTradesFromRows(rows, { preferredAccount: "MISSING" });
    expect(trades).toEqual([]);
    expect(trades.diagnostics).toMatchObject({ preferredAccountMissing: true, accounts: ["AVAILABLE"], status: "Preferred Account Missing" });
  });

  it("keeps an equally plausible automatic fallback ambiguous", () => {
    const rows = ["A", "B"].flatMap((account) => [
      { ...order({ time: "13:30:00", side: "Buy", quantity: 10, price: 10 }), Account: account, Login: "L" },
      { ...order({ time: "13:31:00", side: "Sell", quantity: 10, price: 11 }), Account: account, Login: "L" },
    ]);
    const trades = parseTradesFromRows(rows);
    expect(trades).toEqual([]);
    expect(trades.diagnostics).toMatchObject({ ambiguous: true, status: "Ambiguous Account" });
  });

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
