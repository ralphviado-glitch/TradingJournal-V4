import { EXIT_EFFICIENCY_BUCKETS, ROOM_R_BUCKETS, RULE_ADHERENCE_BUCKETS, bucketValue, getSampleSizeLabel } from "./analyticsBuckets";
import { getAuthoritativePnl } from "../tradePnl";

export const GOOD_PROCESS_RULE = {
  setupQualities: ["A+", "A"],
  executionQualities: ["Excellent", "Good"],
};

export const MATRIX_METRICS = ["tradeCount", "winRate", "netPnl", "averagePnl", "averageMfeR"];

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value, places = 2) {
  return Number(value.toFixed(places));
}

export function averageOf(trades, field) {
  const values = trades.map((trade) => numberOrNull(trade[field])).filter((value) => value !== null);
  return values.length ? rounded(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export function summarizeTrades(trades = []) {
  const pnlValues = trades.map((trade) => numberOrNull(getAuthoritativePnl(trade))).filter((value) => value !== null);
  const wins = pnlValues.filter((value) => value > 0);
  const losses = pnlValues.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = losses.reduce((sum, value) => sum + value, 0);
  const realizedRValues = trades.map((trade) => {
    const pnl = numberOrNull(getAuthoritativePnl(trade));
    const risk = numberOrNull(trade.actual_risk ?? trade.planned_risk ?? trade.risk);
    return pnl !== null && risk !== null && risk > 0 ? pnl / risk : null;
  }).filter((value) => value !== null);
  return {
    tradeCount: trades.length,
    winRate: pnlValues.length ? rounded((wins.length / pnlValues.length) * 100, 1) : null,
    netPnl: pnlValues.length ? rounded(pnlValues.reduce((sum, value) => sum + value, 0)) : null,
    averagePnl: pnlValues.length ? rounded(pnlValues.reduce((sum, value) => sum + value, 0) / pnlValues.length) : null,
    averageWinner: wins.length ? rounded(grossProfit / wins.length) : null,
    averageLoser: losses.length ? rounded(grossLoss / losses.length) : null,
    profitFactor: losses.length ? rounded(grossProfit / Math.abs(grossLoss)) : grossProfit > 0 ? null : null,
    averageExitEfficiency: averageOf(trades, "exit_efficiency"),
    averageMfeR: averageOf(trades, "mfe_r"),
    averageMaeR: averageOf(trades, "mae_r"),
    averageRuleAdherence: averageOf(trades, "rule_adherence_score"),
    averageExecutionScore: averageOf(trades, "execution_score"),
    averageRealizedR: realizedRValues.length ? rounded(realizedRValues.reduce((sum, value) => sum + value, 0) / realizedRValues.length) : null,
    sampleLabel: getSampleSizeLabel(trades.length),
  };
}

export function groupTrades(trades, categories, classifier) {
  return categories.map((category) => {
    const matching = trades.filter((trade) => classifier(trade) === category);
    return { category, ...summarizeTrades(matching) };
  });
}

export const displacementCategory = (trade) => trade.displacement_present === false ? "No displacement" : trade.displacement_present === true ? (trade.displacement_quality || "Unknown") : "Unknown";
export const retestCategory = (trade) => trade.retest_present === false ? "No retest" : trade.retest_present === true ? (trade.retest_quality || "Unknown") : "Unknown";
export const threeStateCategory = (value) => value === true ? "Yes" : value === false ? "No" : "Unknown";

export function buildDisplacementAnalysis(trades) {
  return groupTrades(trades, ["Strong", "Acceptable", "Weak", "No displacement", "Unknown"], displacementCategory);
}

export function buildRetestAnalysis(trades) {
  return groupTrades(trades, ["Clean", "Acceptable", "Weak", "Failed", "No retest", "Unknown"], retestCategory);
}

export function buildCategoryAnalysis(trades, field, categories) {
  return groupTrades(trades, categories, (trade) => trade[field] ?? "Unknown");
}

export function buildThreeStateAnalysis(trades, field) {
  return groupTrades(trades, ["Yes", "No", "Unknown"], (trade) => threeStateCategory(trade[field]));
}

export function buildBucketAnalysis(trades, field, buckets) {
  return groupTrades(trades, [...buckets.map((bucket) => bucket.label), "Unknown"], (trade) => bucketValue(trade[field], buckets));
}

export const buildRoomAnalysis = (trades) => buildBucketAnalysis(trades, "distance_to_next_level_r", ROOM_R_BUCKETS);
export const buildExitEfficiencyAnalysis = (trades) => buildBucketAnalysis(trades, "exit_efficiency", EXIT_EFFICIENCY_BUCKETS);
export const buildRuleAdherenceAnalysis = (trades) => buildBucketAnalysis(trades, "rule_adherence_score", RULE_ADHERENCE_BUCKETS);

export function buildMatrix(trades, rowCategories, columnCategories, rowClassifier, columnClassifier) {
  return rowCategories.map((row) => ({
    category: row,
    cells: columnCategories.map((column) => {
      const matching = trades.filter((trade) => rowClassifier(trade) === row && columnClassifier(trade) === column);
      return { category: column, ...summarizeTrades(matching) };
    }),
  }));
}

export function buildDisplacementRetestMatrix(trades) {
  const rows = ["Strong", "Acceptable", "Weak", "No displacement", "Unknown"];
  const columns = ["Clean", "Acceptable", "Weak", "Failed", "No retest", "Unknown"];
  return { rows, columns, data: buildMatrix(trades, rows, columns, displacementCategory, retestCategory) };
}

export function buildSetupExecutionMatrix(trades) {
  const rows = ["A+", "A", "B", "C", "D", "Unknown"];
  const columns = ["Excellent", "Good", "Average", "Poor", "Unknown"];
  return { rows, columns, data: buildMatrix(trades, rows, columns, (trade) => trade.setup_quality || "Unknown", (trade) => trade.execution_quality || "Unknown") };
}

export function classifyProcessOutcome(trade) {
  const hasProcessData = Boolean(trade.setup_quality && trade.execution_quality);
  const goodProcess = hasProcessData && GOOD_PROCESS_RULE.setupQualities.includes(trade.setup_quality) && GOOD_PROCESS_RULE.executionQualities.includes(trade.execution_quality);
  const pnl = numberOrNull(getAuthoritativePnl(trade));
  if (!hasProcessData || pnl === null || pnl === 0) return "Unclassified";
  return `${goodProcess ? "Good Process" : "Poor Process"} / ${pnl > 0 ? "Win" : "Loss"}`;
}

export function buildProcessOutcomeAnalysis(trades) {
  const categories = ["Good Process / Win", "Good Process / Loss", "Poor Process / Win", "Poor Process / Loss", "Unclassified"];
  return groupTrades(trades, categories, classifyProcessOutcome).map((row) => ({
    ...row,
    percentage: trades.length ? rounded((row.tradeCount / trades.length) * 100, 1) : null,
  }));
}

export function buildRuleViolationAnalysis(trades) {
  const violations = new Map();
  trades.forEach((trade) => (trade.rule_violations || []).forEach((violation) => {
    if (!violations.has(violation)) violations.set(violation, []);
    violations.get(violation).push(trade);
  }));
  return [...violations.entries()].map(([category, matching]) => {
    const stats = summarizeTrades(matching);
    const losingPnl = matching.map((trade) => numberOrNull(getAuthoritativePnl(trade))).filter((pnl) => pnl !== null && pnl < 0).reduce((sum, pnl) => sum + pnl, 0);
    return { category, ...stats, totalLosingPnl: rounded(losingPnl) };
  });
}

export function buildCombinedAlignment(trades) {
  return groupTrades(trades, ["Both Aligned", "One Aligned", "Neither Aligned", "Unknown"], (trade) => {
    if (!trade.qqq_alignment || !trade.spy_alignment) return "Unknown";
    const count = [trade.qqq_alignment, trade.spy_alignment].filter((value) => value === "Aligned").length;
    return count === 2 ? "Both Aligned" : count === 1 ? "One Aligned" : "Neither Aligned";
  });
}

export function buildTickerAnalysis(trades) {
  return groupTrades(trades, [...new Set(trades.map((trade) => trade.ticker || "Unknown"))], (trade) => trade.ticker || "Unknown");
}
