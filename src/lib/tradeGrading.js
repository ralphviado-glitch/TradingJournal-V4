export const GRADING_VERSION = "trade-review-v1";
export const SEQUENCE_STAGES = ["break", "displacement", "acceptance", "retest", "hold", "trigger"];
export const GRADE_POINTS = { "A+": 5, A: 4, B: 3, C: 2, D: 1, F: 0 };

export const VIOLATION_RULES = {
  "Anticipated Entry": { penalty: 2, cap: "C", serious: true }, Chased: { penalty: 2, cap: "C", serious: true },
  FOMO: { penalty: 2, cap: "C", serious: true }, "Early Entry": { penalty: 2, cap: "C", serious: true },
  "No Confirmation": { penalty: 2, cap: "C", serious: true }, Oversized: { penalty: 3, cap: "C", critical: true },
  "Moved Stop Wider": { penalty: 4, cap: "D", critical: true }, "Revenge Trade": { penalty: 4, cap: "D", finalCap: "D", critical: true },
  "Unplanned Trade": { penalty: 3, cap: "D", finalCap: "D", critical: true }, "Broke Max Trades Rule": { penalty: 3, cap: "D", finalCap: "D", critical: true },
  Overtraded: { penalty: 2, cap: "C" }, "Entered Against Market Context": { penalty: 2, cap: "C" }, "Poor R:R": { penalty: 2, cap: "C" },
};

const gradeForScore = (score) => score >= 96 ? "A+" : score >= 86 ? "A" : score >= 72 ? "B" : score >= 58 ? "C" : score >= 40 ? "D" : "F";
const lowerGrade = (grade, cap) => GRADE_POINTS[grade] > GRADE_POINTS[cap] ? cap : grade;
const statusScore = (value) => value === "met" ? 1 : value === "not_met" ? 0 : 0.5;

export function isQuickReviewComplete(review = {}) {
  return Boolean(review.setupTagIds?.length && SEQUENCE_STAGES.every((stage) => review.sequence?.[stage]) &&
    review.marketContext && review.roomQuality && review.plannedLevel && review.validEntryTrigger &&
    review.stopFollowed && review.riskFollowed && review.managementFollowed && Array.isArray(review.ruleViolations));
}

export function gradeTradeReview(review = {}, outcome = "breakeven") {
  const sequence = review.sequence || {};
  const required = SEQUENCE_STAGES.filter((stage) => !(["retest", "hold"].includes(stage) && sequence[stage] === "na"));
  const core = required.reduce((sum, stage) => sum + statusScore(sequence[stage]), 0) / Math.max(required.length, 1) * 70;
  const context = ({ aligned: 12, neutral: 6, against: 0 }[review.marketContext] ?? 0) +
    ({ good: 10, marginal: 5, poor: 0 }[review.roomQuality] ?? 0) + ({ yes: 8, no: 0 }[review.plannedLevel] ?? 0);
  const setupScore = Math.round(core + context);
  let setupGrade = gradeForScore(setupScore);
  if (required.some((stage) => sequence[stage] === "not_met")) setupGrade = lowerGrade(setupGrade, "B");
  if (["break", "displacement", "acceptance", "trigger"].some((stage) => sequence[stage] !== "met")) setupGrade = lowerGrade(setupGrade, "C");

  const checks = [review.validEntryTrigger, review.stopFollowed, review.riskFollowed, review.managementFollowed, review.exitPlanFollowed]
    .filter((value) => value && value !== "na");
  let executionScore = checks.length ? checks.reduce((sum, value) => sum + (value === "yes" ? 1 : 0), 0) / checks.length * 100 : 0;
  const violations = (review.ruleViolations || []).filter((item) => item !== "None");
  executionScore = Math.max(0, Math.round(executionScore - violations.reduce((sum, item) => sum + (VIOLATION_RULES[item]?.penalty || 1) * 8, 0)));
  let executionGrade = gradeForScore(executionScore);
  violations.forEach((item) => { if (VIOLATION_RULES[item]?.cap) executionGrade = lowerGrade(executionGrade, VIOLATION_RULES[item].cap); });
  let finalGrade = gradeForScore(Math.round(setupScore * 0.45 + executionScore * 0.55));
  finalGrade = lowerGrade(finalGrade, setupGrade);
  violations.forEach((item) => { if (VIOLATION_RULES[item]?.finalCap) finalGrade = lowerGrade(finalGrade, VIOLATION_RULES[item].finalCap); });

  const result = String(outcome).toLowerCase();
  const strong = ["A+", "A"].includes(finalGrade);
  const outcomeClassification = result === "win" ? (strong ? "Excellent Trade" : ["C", "D", "F"].includes(finalGrade) ? "Bad Win" : "Process Review")
    : result === "loss" ? (strong ? "Good Loss" : finalGrade === "B" ? "Acceptable Loss / Review" : "Bad Trade")
      : strong ? "Excellent Process / Breakeven" : "Process Review / Breakeven";
  const issues = [...required.filter((stage) => sequence[stage] !== "met").map((stage) => `${stage} was ${sequence[stage] === "not_met" ? "not met" : "not confirmed"}`),
    ...checks.map((value, index) => value === "no" ? `${["entry trigger", "stop", "risk/size", "management", "exit plan"][index]} was not followed` : null).filter(Boolean), ...violations];
  return { setupGrade, executionGrade, finalGrade, outcomeClassification,
    explanation: issues.length ? `Process issues: ${issues.join(", ")}.` : "Complete setup sequence with clean execution and no rule violations.",
    scoreBreakdown: { setupScore, executionScore, setupWeight: 45, executionWeight: 55 }, gradingVersion: GRADING_VERSION };
}
