import { describe, expect, it } from "vitest";
import { initialTradeReviewState, tradeReviewReducer } from "./tradeReviewState";

describe("trade review modal state", () => {
  const amd = { id: "1", ticker: "AMD" };
  const nvda = { id: "2", ticker: "NVDA" };

  it("opens the requested trade and closes cleanly", () => {
    const open = tradeReviewReducer(initialTradeReviewState, { type: "open", trade: amd });
    expect(open).toEqual({ selectedTrade: amd, isOpen: true });
    expect(tradeReviewReducer(open, { type: "close" })).toEqual(initialTradeReviewState);
  });

  it("switches directly to the newly requested trade", () => {
    const open = tradeReviewReducer(initialTradeReviewState, { type: "open", trade: amd });
    expect(tradeReviewReducer(open, { type: "open", trade: nvda }).selectedTrade).toBe(nvda);
  });

  it("refreshes only the currently displayed trade after save", () => {
    const open = { selectedTrade: amd, isOpen: true };
    const updated = { ...amd, notes: "Saved" };
    expect(tradeReviewReducer(open, { type: "update", trade: updated }).selectedTrade).toBe(updated);
    expect(tradeReviewReducer(open, { type: "update", trade: nvda })).toBe(open);
  });
});
