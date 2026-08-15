import { describe, expect, it } from "vitest";
import { applyFees, getAuthoritativePnl } from "./tradePnl";

describe("authoritative trade P&L", () => {
  it("calculates net P&L from gross and a known fee", () => {
    expect(applyFees({ gross_pnl: -96.1, pnl: -96.1 }, 1.5)).toMatchObject({ fees: 1.5, net_pnl: -97.6, pnl: -97.6 });
  });
  it("preserves unknown fees as null and prefers explicit net over legacy pnl", () => {
    expect(applyFees({ gross_pnl: 10, pnl: 10 }, "").fees).toBeNull();
    expect(getAuthoritativePnl({ net_pnl: 8, pnl: 10, gross_pnl: 10 })).toBe(8);
    expect(getAuthoritativePnl({ pnl: 7 })).toBe(7);
  });
});
