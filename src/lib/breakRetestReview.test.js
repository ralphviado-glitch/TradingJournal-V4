import { describe, expect, it } from "vitest";
import { calculateRoomToNextLevel, deriveRoomFields, normalizeThreeState, validateBreakRetestReview } from "./breakRetestReview";

describe("Break & Retest review", () => {
  it("preserves null, true, and false", () => {
    expect(normalizeThreeState(null)).toBeNull(); expect(normalizeThreeState("unknown")).toBeNull();
    expect(normalizeThreeState(true)).toBe(true); expect(normalizeThreeState("false")).toBe(false);
  });
  it("calculates Long and Short room", () => {
    expect(calculateRoomToNextLevel({ direction: "Long", entryPrice: 180, nextLevelPrice: 182.5 })).toEqual({ distance: 2.5, distanceR: null });
    expect(calculateRoomToNextLevel({ direction: "Short", entryPrice: 180, nextLevelPrice: 177 })).toEqual({ distance: 3, distanceR: null });
  });
  it("rejects negative or invalid room", () => {
    expect(calculateRoomToNextLevel({ direction: "Long", entryPrice: 180, nextLevelPrice: 179 })).toEqual({ distance: null, distanceR: null });
    expect(calculateRoomToNextLevel({ direction: "Sideways", entryPrice: 180, nextLevelPrice: 182 })).toEqual({ distance: null, distanceR: null });
  });
  it("calculates room in R and handles missing risk", () => {
    expect(calculateRoomToNextLevel({ direction: "Long", entryPrice: 180, nextLevelPrice: 182.5, riskPerShare: 1 }).distanceR).toBe(2.5);
    expect(deriveRoomFields({ direction: "Long", entry_price: 180, next_level_price: 182.5 })).toEqual({ distance_to_next_level: 2.5, distance_to_next_level_r: null });
  });
  it("validates controlled values and score boundaries", () => {
    expect(() => validateBreakRetestReview({ displacement_quality: "Strong", rule_adherence_score: 0 })).not.toThrow();
    expect(() => validateBreakRetestReview({ rule_adherence_score: 100 })).not.toThrow();
    expect(() => validateBreakRetestReview({ retest_quality: "Perfect" })).toThrow(/Invalid retest/);
    expect(() => validateBreakRetestReview({ rule_adherence_score: 101 })).toThrow(/between 0 and 100/);
  });
  it("accepts multiple controlled violations and rejects unknown tags", () => {
    expect(() => validateBreakRetestReview({ rule_violations: ["Chased Entry", "Against QQQ"] })).not.toThrow();
    expect(() => validateBreakRetestReview({ rule_violations: ["Made Up Rule"] })).toThrow(/Invalid rule violations/);
  });
  it("is backward compatible with old trades", () => {
    expect(deriveRoomFields({})).toEqual({ distance_to_next_level: null, distance_to_next_level_r: null });
    expect(() => validateBreakRetestReview({})).not.toThrow();
  });
});
