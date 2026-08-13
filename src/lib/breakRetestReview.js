export const BREAK_DIRECTIONS = ["Long", "Short"];
export const BREAK_LEVEL_TYPES = ["PMH", "PML", "PDH", "PDL", "HOD", "LOD", "ATH", "Major Resistance", "Major Support", "5-Min ORB High", "5-Min ORB Low", "Other"];
export const DISPLACEMENT_QUALITIES = ["Strong", "Acceptable", "Weak"];
export const RETEST_QUALITIES = ["Clean", "Acceptable", "Weak", "Failed"];
export const INDEX_ALIGNMENTS = ["Aligned", "Neutral", "Against"];
export const MARKET_ALIGNMENTS = ["Strong", "Mixed", "Against"];
export const ENTRY_TRIGGERS = ["Retest Hold", "Reclaim", "Confirmation Candle", "Pause / Continuation", "Immediate Break", "Anticipation", "Other"];
export const ENTRY_CONFIRMATIONS = ["Strong", "Acceptable", "Weak", "None"];
export const RULE_VIOLATION_OPTIONS = ["Anticipation Entry", "Chased Entry", "No Displacement", "No Proper Retest", "Entered Before 5 Minutes", "Against QQQ", "Against SPY", "No Room to Next Level", "Entered Extended", "Poor Stop Placement", "Oversized Position", "Broke Risk Limit", "Early Exit", "Moved Stop", "FOMO", "Revenge Trade", "Other"];

export const THREE_STATE_FIELDS = ["break_retest_setup", "displacement_present", "retest_present", "volume_confirmation", "room_to_next_level", "extended_before_entry", "entered_after_first_5min", "first_5min_break"];

const CONTROLLED_FIELDS = {
  break_direction: BREAK_DIRECTIONS,
  break_level_type: BREAK_LEVEL_TYPES,
  displacement_quality: DISPLACEMENT_QUALITIES,
  retest_quality: RETEST_QUALITIES,
  qqq_alignment: INDEX_ALIGNMENTS,
  spy_alignment: INDEX_ALIGNMENTS,
  market_alignment: MARKET_ALIGNMENTS,
  entry_trigger: ENTRY_TRIGGERS,
  entry_confirmation: ENTRY_CONFIRMATIONS,
};

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeThreeState(value) {
  if (value === true || value === "true" || value === "yes") return true;
  if (value === false || value === "false" || value === "no") return false;
  return null;
}

export function formatThreeState(value) {
  return value === true ? "Yes" : value === false ? "No" : "Unknown";
}

export function calculateRoomToNextLevel({ direction, entryPrice, nextLevelPrice, riskPerShare }) {
  const entry = numberOrNull(entryPrice);
  const next = numberOrNull(nextLevelPrice);
  const risk = numberOrNull(riskPerShare);
  if (entry === null || next === null || !BREAK_DIRECTIONS.includes(direction)) {
    return { distance: null, distanceR: null };
  }
  const rawDistance = direction === "Short" ? entry - next : next - entry;
  if (rawDistance < 0) return { distance: null, distanceR: null };
  const distance = Number(rawDistance.toFixed(4));
  return {
    distance,
    distanceR: risk !== null && risk > 0 ? Number((distance / risk).toFixed(2)) : null,
  };
}

export function getRiskPerShare(trade = {}) {
  const entry = numberOrNull(trade.entry_price ?? trade.actual_entry);
  const stop = numberOrNull(trade.actual_stop ?? trade.planned_stop);
  if (entry === null || stop === null || entry === stop) return null;
  return Math.abs(entry - stop);
}

export function deriveRoomFields(trade = {}) {
  const room = calculateRoomToNextLevel({
    direction: trade.direction,
    entryPrice: trade.entry_price ?? trade.actual_entry,
    nextLevelPrice: trade.next_level_price,
    riskPerShare: getRiskPerShare(trade),
  });
  return { distance_to_next_level: room.distance, distance_to_next_level_r: room.distanceR };
}

export function validateBreakRetestReview(updates = {}) {
  for (const [field, values] of Object.entries(CONTROLLED_FIELDS)) {
    if (field in updates && updates[field] !== null && updates[field] !== "" && !values.includes(updates[field])) {
      throw new Error(`Invalid ${field.replaceAll("_", " ")}.`);
    }
  }
  for (const field of THREE_STATE_FIELDS) {
    if (field in updates && updates[field] !== null && updates[field] !== "" && ![true, false, "true", "false", "yes", "no", "unknown"].includes(updates[field])) {
      throw new Error(`Invalid ${field.replaceAll("_", " ")}.`);
    }
  }
  if ("rule_adherence_score" in updates && updates.rule_adherence_score !== null && updates.rule_adherence_score !== "") {
    const score = numberOrNull(updates.rule_adherence_score);
    if (score === null || score < 0 || score > 100) throw new Error("Rule adherence score must be between 0 and 100.");
  }
  if ("rule_violations" in updates) {
    if (updates.rule_violations !== null && (!Array.isArray(updates.rule_violations) || updates.rule_violations.some((value) => !RULE_VIOLATION_OPTIONS.includes(value)))) {
      throw new Error("Invalid rule violations.");
    }
  }
}
