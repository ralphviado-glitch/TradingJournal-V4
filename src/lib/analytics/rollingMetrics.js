import { INSIGHT_RULES } from "./insightRules";
import { classifyProcessOutcome, summarizeTrades } from "./strategyAnalytics";

function rounded(value) { return Number(value.toFixed(1)); }

export function goodProcessPercentage(trades = []) {
  const classified = trades.filter((trade) => classifyProcessOutcome(trade) !== "Unclassified");
  if (!classified.length) return null;
  return rounded((classified.filter((trade) => classifyProcessOutcome(trade).startsWith("Good Process")).length / classified.length) * 100);
}

export function splitRollingWindow(trades = [], windowSize = INSIGHT_RULES.recentWindowSize) {
  const sorted = [...trades].sort((a, b) => String(a.trade_date || a.date || "").localeCompare(String(b.trade_date || b.date || "")) || String(a.entry_time || "").localeCompare(String(b.entry_time || "")));
  const splitIndex = Math.max(0, sorted.length - windowSize);
  return { recent: sorted.slice(splitIndex), historical: sorted.slice(0, splitIndex) };
}

export function classifyTrend(metric, recent, historical) {
  if (recent === null || recent === undefined || historical === null || historical === undefined) return { direction: "N/A", difference: null };
  const difference = rounded(recent - historical);
  const threshold = INSIGHT_RULES.trendThresholds[metric];
  if (!threshold) return { direction: "Stable", difference };
  if (difference >= threshold.improve) return { direction: "Improving", difference };
  if (difference <= threshold.deteriorate) return { direction: "Deteriorating", difference };
  return { direction: "Stable", difference };
}

export function buildRollingMetrics(trades = []) {
  const { recent, historical } = splitRollingWindow(trades);
  const recentStats = summarizeTrades(recent);
  const historicalStats = summarizeTrades(historical);
  const recentValues = { ...recentStats, goodProcessPercentage: goodProcessPercentage(recent) };
  const historicalValues = { ...historicalStats, goodProcessPercentage: goodProcessPercentage(historical) };
  const fields = ["winRate", "averagePnl", "averageRuleAdherence", "averageExecutionScore", "averageExitEfficiency", "goodProcessPercentage", "averageMfeR", "averageMaeR"];
  return {
    recent, historical, recentStats: recentValues, historicalStats: historicalValues,
    comparisons: fields.map((metric) => ({
      metric, recent: recentValues[metric], historical: historicalValues[metric],
      ...(recent.length >= INSIGHT_RULES.minimumPromotedSample && historical.length >= INSIGHT_RULES.minimumPromotedSample
        ? classifyTrend(metric, recentValues[metric], historicalValues[metric])
        : { direction: "N/A", difference: null }),
    })),
  };
}

export function calculateProcessStreaks(trades = []) {
  const sorted = [...trades].sort((a, b) => String(a.trade_date || a.date || "").localeCompare(String(b.trade_date || b.date || "")));
  const currentStreak = (predicate) => {
    let count = 0;
    for (let index = sorted.length - 1; index >= 0 && predicate(sorted[index]); index -= 1) count += 1;
    return count;
  };
  return {
    consecutiveGoodProcess: currentStreak((trade) => classifyProcessOutcome(trade).startsWith("Good Process")),
    consecutivePoorProcess: currentStreak((trade) => classifyProcessOutcome(trade).startsWith("Poor Process")),
    consecutiveRuleAdherent: currentStreak((trade) => trade.rule_adherence_score != null && Number(trade.rule_adherence_score) >= INSIGHT_RULES.ruleAdherentThreshold),
  };
}
