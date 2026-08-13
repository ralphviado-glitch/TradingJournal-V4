import { describe, expect, it } from "vitest";
import {
  calculateEntryDeviation,
  calculateExitEfficiency,
  calculateImportedEntryDeviation,
  calculateImportedTargetDeviation,
  calculateStopDeviation,
  calculateTargetDeviation,
  getExitEfficiencyRating,
} from "./executionAnalysis";

describe("execution analysis calculations", () => {
  it("calculates entry deviation", () => {
    expect(calculateEntryDeviation({ planned_entry: 180.25, actual_entry: 180.4 })).toBe(0.15);
  });

  it("uses imported entry and exit for execution deviations when present", () => {
    expect(
      calculateImportedEntryDeviation({
        planned_entry: 430,
        entry_price: 433.88,
        actual_entry: 101,
      })
    ).toBe(3.88);
    expect(
      calculateImportedTargetDeviation({
        planned_target: 435,
        exit_price: 434.76,
        actual_exit: 99,
      })
    ).toBe(-0.24);
  });

  it("calculates stop deviation", () => {
    expect(calculateStopDeviation({ planned_stop: 178, actual_stop: 177.75 })).toBe(-0.25);
  });

  it("calculates target deviation", () => {
    expect(calculateTargetDeviation({ planned_target: 185, actual_exit: 184.25 })).toBe(-0.75);
  });

  it("calculates and caps exit efficiency", () => {
    expect(calculateExitEfficiency({ realizedProfit: 75, mfe: 100 })).toBe(75);
    expect(calculateExitEfficiency({ realizedProfit: 150, mfe: 100 })).toBe(100);
  });

  it("returns null for invalid exit efficiency edge cases", () => {
    expect(calculateExitEfficiency({ realizedProfit: 50, mfe: 0 })).toBeNull();
    expect(calculateExitEfficiency({ realizedProfit: 50, mfe: -1 })).toBeNull();
    expect(calculateExitEfficiency({ realizedProfit: null, mfe: 100 })).toBeNull();
    expect(calculateExitEfficiency({ realizedProfit: 50, mfe: null })).toBeNull();
  });

  it("rates exit efficiency", () => {
    expect(getExitEfficiencyRating(95)).toBe("Excellent");
    expect(getExitEfficiencyRating(80)).toBe("Good");
    expect(getExitEfficiencyRating(60)).toBe("Average");
    expect(getExitEfficiencyRating(49)).toBe("Poor");
    expect(getExitEfficiencyRating(null)).toBe("N/A");
  });
});
