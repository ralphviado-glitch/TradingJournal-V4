import { describe, expect, it } from "vitest";
import { calculatePositionSize } from "./risk";

describe("position size calculation", () => {
  it("calculates shares from stop distance", () => {
    const result = calculatePositionSize({
      entryPrice: 100,
      stopPrice: 99,
      standardRisk: 100,
      reducedRisk: 50,
    });

    expect(result).toMatchObject({
      isValid: true,
      stopDistance: 1,
      sharesAtStandardRisk: 100,
      sharesAtReducedRisk: 50,
    });
  });

  it("calculates Long 1R and 2R prices", () => {
    const result = calculatePositionSize({
      direction: "Long",
      entryPrice: 100,
      stopPrice: 98,
    });

    expect(result.oneRPrice).toBe(102);
    expect(result.twoRPrice).toBe(104);
  });

  it("calculates Short 1R and 2R prices", () => {
    const result = calculatePositionSize({
      direction: "Short",
      entryPrice: 100,
      stopPrice: 102,
    });

    expect(result.oneRPrice).toBe(98);
    expect(result.twoRPrice).toBe(96);
  });

  it("rejects invalid entry and stop values", () => {
    expect(calculatePositionSize({ entryPrice: "", stopPrice: 99 }).isValid).toBe(false);
    expect(calculatePositionSize({ entryPrice: 100, stopPrice: 100 }).isValid).toBe(false);
    expect(calculatePositionSize({ entryPrice: -1, stopPrice: 99 }).isValid).toBe(false);
  });
});
