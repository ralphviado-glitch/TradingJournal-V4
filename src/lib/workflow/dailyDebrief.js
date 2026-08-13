import { GOOD_PROCESS_RULE, averageOf } from "../analytics/strategyAnalytics";
import { getTradeReviewCompleteness } from "./reviewCompleteness";

function rounded(value, places = 1) {
  return Number(value.toFixed(places));
}

function distribution(trades, field) {
  return trades.reduce((counts, trade) => {
    const value = trade[field] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function processScore(trade) {
  const setup = { "A+": 5, A: 4, B: 3, C: 2, D: 1 }[trade.setup_quality] ?? 0;
  const execution = { Excellent: 4, Good: 3, Average: 2, Poor: 1 }[trade.execution_quality] ?? 0;
  const adherence = Number.isFinite(Number(trade.rule_adherence_score)) ? Number(trade.rule_adherence_score) / 25 : 0;
  return setup + execution + adherence;
}

export function buildDailyDebrief(trades = []) {
  const pnl = trades.map((trade) => Number(trade.pnl)).filter(Number.isFinite);
  const wins = pnl.filter((value) => value > 0).length;
  const losses = pnl.filter((value) => value < 0).length;
  const breakeven = pnl.filter((value) => value === 0).length;
  const reviewed = trades.filter((trade) => getTradeReviewCompleteness(trade).status === "Review Complete").length;
  const processClassified = trades.filter((trade) => trade.setup_quality && trade.execution_quality);
  const goodProcess = processClassified.filter((trade) => GOOD_PROCESS_RULE.setupQualities.includes(trade.setup_quality) && GOOD_PROCESS_RULE.executionQualities.includes(trade.execution_quality)).length;
  const violations = trades.flatMap((trade) => trade.rule_violations || []);
  const violationCounts = violations.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {});
  const ranked = trades.filter((trade) => trade.setup_quality || trade.execution_quality || trade.rule_adherence_score != null)
    .map((trade) => ({ trade, score: processScore(trade) })).sort((a, b) => b.score - a.score);
  return {
    totalTrades: trades.length, wins, losses, breakeven,
    netPnl: pnl.length ? rounded(pnl.reduce((sum, value) => sum + value, 0), 2) : null,
    winRate: pnl.length ? rounded((wins / pnl.length) * 100) : null,
    averageMfe: averageOf(trades, "mfe"), averageMae: averageOf(trades, "mae"),
    averageMfeR: averageOf(trades, "mfe_r"), averageMaeR: averageOf(trades, "mae_r"),
    averageExitEfficiency: averageOf(trades, "exit_efficiency"),
    averageRuleAdherence: averageOf(trades, "rule_adherence_score"),
    averageExecutionScore: averageOf(trades, "execution_score"),
    goodProcessPercentage: processClassified.length ? rounded((goodProcess / processClassified.length) * 100) : null,
    reviewCompletionPercentage: trades.length ? rounded((reviewed / trades.length) * 100) : null,
    setupQualityDistribution: distribution(trades, "setup_quality"),
    executionQualityDistribution: distribution(trades, "execution_quality"),
    breakRetestTrades: trades.filter((trade) => trade.break_retest_setup === true).length,
    watchlistMatches: trades.filter((trade) => trade.watchlist_match_status === "Matched").length,
    directionMatches: trades.filter((trade) => trade.direction_matched === true).length,
    mostFrequentRuleViolation: Object.entries(violationCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null,
    bestProcessTrade: ranked[0]?.trade || null,
    tradeNeedingMostReview: ranked.length > 1 ? ranked.at(-1).trade : null,
  };
}
