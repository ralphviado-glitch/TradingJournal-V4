import { describe, expect, it } from "vitest";
import { calculateTtpExecutionCommission, deduplicateFilledExecutions } from "./ttpCommission";

describe("Trade The Pool commissions", () => {
  it("applies the per-filled-order minimum", () => {
    expect(calculateTtpExecutionCommission(5)).toBe(.75); expect(calculateTtpExecutionCommission(50)).toBe(.75); expect(calculateTtpExecutionCommission(150)).toBe(.75);
  });
  it("uses half a cent per share above 150 shares", () => {
    expect(calculateTtpExecutionCommission(200)).toBe(1); expect(calculateTtpExecutionCommission(500)).toBe(2.5);
  });
  it("removes only exact duplicate execution representations", () => {
    const base = { account: "A", login: "L", orderId: "1", timestampUtc: "2026-08-01T01:00:00Z", ticker: "AMD", side: "Buy", quantity: 50, price: 10 };
    const result = deduplicateFilledExecutions([base, { ...base }, { ...base, quantity: 25 }]);
    expect(result.executions).toHaveLength(2); expect(result.duplicates).toHaveLength(1);
  });
});
