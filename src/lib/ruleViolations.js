export const NO_RULE_VIOLATIONS = "None";

export const QUICK_REVIEW_VIOLATIONS = [
  "Anticipated Entry", "Chased", "FOMO", "Early Entry", "No Confirmation",
  "Oversized", "Moved Stop Wider", "Revenge Trade", "Unplanned Trade",
  "Overtraded", "Broke Max Trades Rule", "Entered Against Market Context",
  "Poor R:R", "Other",
];

export const HISTORICAL_RULE_VIOLATIONS = [
  "Anticipation Entry", "Chased Entry", "No Displacement", "No Proper Retest",
  "Entered Before 5 Minutes", "Against QQQ", "Against SPY", "No Room to Next Level",
  "Entered Extended", "Poor Stop Placement", "Oversized Position", "Broke Risk Limit",
  "Early Exit", "Moved Stop", "FOMO", "Revenge Trade", "Other",
];

export const PERSISTED_RULE_VIOLATIONS = [...new Set([
  ...HISTORICAL_RULE_VIOLATIONS,
  ...QUICK_REVIEW_VIOLATIONS,
])];

export function normalizeRuleViolations(value) {
  const values = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  return [...new Set(values.filter((item) => item && item !== NO_RULE_VIOLATIONS))];
}

export function ruleViolationsForDisplay(value) {
  const normalized = normalizeRuleViolations(value);
  return normalized.length ? normalized : [NO_RULE_VIOLATIONS];
}

export function toggleRuleViolation(selected, violation) {
  const normalized = normalizeRuleViolations(selected);
  if (violation === NO_RULE_VIOLATIONS) return [NO_RULE_VIOLATIONS];
  return normalized.includes(violation)
    ? ruleViolationsForDisplay(normalized.filter((item) => item !== violation))
    : [...normalized, violation];
}
