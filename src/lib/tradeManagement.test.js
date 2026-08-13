import { describe, expect, it } from "vitest";
import {
  calculatePositionPercent, calculateScalePnl, deriveScaleOutFromOrders,
  getManagementSummary, isValidExecutionQuality, isValidExecutionScore,
  isValidPercentage, isValidSetupQuality, validateTradeManagement,
} from "./tradeManagement";

const order = (side, quantity, price, timestamp) => ({ side, quantity, price, timestamp, time: timestamp });

describe("trade management calculations", () => {
  it("calculates first scale, runner, and an 80/20 split", () => {
    expect(calculatePositionPercent(80, 100)).toBe(80);
    expect(calculatePositionPercent(20, 100)).toBe(20);
  });
  it("calculates Long and Short scale P&L", () => {
    expect(calculateScalePnl({ direction: "Long", entryPrice: 10, exitPrice: 12, shares: 80 })).toBe(160);
    expect(calculateScalePnl({ direction: "Short", entryPrice: 20, exitPrice: 18, shares: 80 })).toBe(160);
  });
  it("calculates runner contribution", () => {
    expect(getManagementSummary({ direction: "Long", entry_price: 10, first_scale_price: 11.5, first_scale_shares: 80, runner_exit_price: 14, runner_shares: 20 }).runnerContribution).toBe(40);
  });
  it("returns null when partial-exit data is missing", () => {
    expect(getManagementSummary({ direction: "Long", entry_price: 10 }).runnerContribution).toBeNull();
    expect(deriveScaleOutFromOrders({ shares: 100, direction: "Long", orders: [] })).toBeNull();
  });
  it("validates percentages, scores, and quality values", () => {
    expect(isValidPercentage(100)).toBe(true); expect(isValidPercentage(101)).toBe(false);
    expect(isValidExecutionScore(0)).toBe(true); expect(isValidExecutionScore(100)).toBe(true); expect(isValidExecutionScore(-1)).toBe(false);
    expect(isValidSetupQuality("A+")).toBe(true); expect(isValidSetupQuality("Excellent")).toBe(false);
    expect(isValidExecutionQuality("Excellent")).toBe(true); expect(isValidExecutionQuality("A")).toBe(false);
    expect(() => validateTradeManagement({ planned_runner_percent: 120 })).toThrow(/between 0 and 100/);
  });
  it("is backward compatible with trades without Phase 3B data", () => {
    expect(getManagementSummary({})).toEqual({ firstScaleDeviation: null, runnerDeviation: null, firstScalePnl: null, runnerPnl: null, runnerContribution: null });
  });
});

describe("order-derived scale outs", () => {
  it("does not classify one full exit as a scale-out", () => {
    expect(deriveScaleOutFromOrders({ direction: "Long", shares: 100, orders: [order("Buy", 100, 10, 1), order("Sell", 100, 12, 2)] })).toBeNull();
  });
  it("derives two Long exits", () => {
    expect(deriveScaleOutFromOrders({ direction: "Long", shares: 100, orders: [order("Buy", 100, 10, 1), order("Sell", 80, 11, 2), order("Sell", 20, 13, 3)] })).toMatchObject({ first_scale_price: 11, first_scale_shares: 80, first_scale_percent: 80, runner_exit_price: 13, runner_shares: 20, runner_percent: 20 });
  });
  it("aggregates multiple later exits into the runner", () => {
    expect(deriveScaleOutFromOrders({ direction: "Long", shares: 100, orders: [order("Buy", 100, 10, 1), order("Sell", 50, 11, 2), order("Sell", 25, 12, 3), order("Sell", 25, 14, 4)] })).toMatchObject({ first_scale_shares: 50, runner_shares: 50, runner_exit_price: 13 });
  });
  it("combines exact partial fills into one exit event", () => {
    expect(deriveScaleOutFromOrders({ direction: "Long", shares: 100, orders: [order("Buy", 100, 10, 1), order("Sell", 30, 11, 2), order("Sell", 50, 11, 2), order("Sell", 20, 13, 3)] })).toMatchObject({ first_scale_shares: 80, runner_shares: 20 });
  });
  it("derives Short exits", () => {
    expect(deriveScaleOutFromOrders({ direction: "Short", shares: 100, orders: [order("Sell", 100, 20, 1), order("Buy", 80, 19, 2), order("Buy", 20, 17, 3)] })).toMatchObject({ first_scale_price: 19, first_scale_shares: 80, runner_exit_price: 17, runner_shares: 20 });
  });
  it("rejects incomplete exit histories", () => {
    expect(deriveScaleOutFromOrders({ direction: "Long", shares: 100, orders: [order("Buy", 100, 10, 1), order("Sell", 80, 11, 2), order("Sell", 10, 13, 3)] })).toBeNull();
  });
});
