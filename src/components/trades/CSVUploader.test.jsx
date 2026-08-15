import { describe, expect, it } from "vitest";
import { parseUploadedRows } from "../../lib/importPipeline";
import { mapTradeToInsertRow } from "../../lib/tradeService";

const fill = (account, dateTime, symbol, side, quantity, price) => ({
  Account: account, Login: "LOGIN", "Date/Time": dateTime, Symbol: symbol,
  Side: side, Quantity: quantity, Price: price, Event: "Filled",
});

describe("CSVUploader production import seam", () => {
  it("passes the preferred account through reconstruction into persistence payloads", () => {
    const rows = [
      fill("PREFERRED", "15.08.2026 01:30:00", "SNDK", "Buy", 5, 10),
      fill("PREFERRED", "15.08.2026 01:31:00", "SNDK", "Sell", 5, 11),
      fill("OTHER", "15.08.2026 01:30:00", "AMD", "Buy", 50, 20),
      fill("OTHER", "15.08.2026 01:31:00", "AMD", "Sell", 50, 19),
    ];
    const trades = parseUploadedRows(rows, "PREFERRED");
    const payloads = trades.map((trade) => mapTradeToInsertRow(trade, "user-1"));
    expect(trades.diagnostics).toMatchObject({ canonicalAccount: "PREFERRED", selectionMethod: "Preferred Account" });
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ ticker: "SNDK", shares: 5 });
    expect(payloads[0].orders.every((order) => order.account === "PREFERRED")).toBe(true);
  });
});
