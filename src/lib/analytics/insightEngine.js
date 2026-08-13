import { getSampleSizeLabel } from "./analyticsBuckets";
import { INSIGHT_RULES, EXECUTION_LEAK_CANDIDATES } from "./insightRules";
import { buildCombinedAlignment, buildRoomAnalysis, buildRuleViolationAnalysis, buildTickerAnalysis, displacementCategory, retestCategory, summarizeTrades } from "./strategyAnalytics";
import { buildRollingMetrics, calculateProcessStreaks, goodProcessPercentage } from "./rollingMetrics";
import { calculateScalePnl } from "../tradeManagement";

const rounded = (value, places = 1) => Number(value.toFixed(places));

function patternRows(trades) {
  const groups = new Map();
  trades.forEach((trade) => {
    const displacement = displacementCategory(trade);
    const retest = retestCategory(trade);
    if ([displacement, retest].includes("Unknown")) return;
    const category = `${displacement} Displacement + ${retest} Retest`;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(trade);
  });
  return [...groups.entries()].map(([category, matching]) => ({ category, ...summarizeTrades(matching) }));
}

export function selectSetupPatterns(trades, minimumSample = INSIGHT_RULES.minimumPromotedSample) {
  const eligible = patternRows(trades).filter((row) => row.tradeCount >= minimumSample && row.averagePnl !== null);
  const strongest = [...eligible].sort((a, b) => b.averagePnl - a.averagePnl || (b.winRate ?? 0) - (a.winRate ?? 0) || b.tradeCount - a.tradeCount)[0] || null;
  const weakest = [...eligible].sort((a, b) => a.averagePnl - b.averagePnl || (a.winRate ?? 0) - (b.winRate ?? 0) || b.tradeCount - a.tradeCount)[0] || null;
  return { strongest, weakest, all: eligible };
}

export function selectExecutionLeak(trades) {
  const rows = buildRuleViolationAnalysis(trades).filter((row) => EXECUTION_LEAK_CANDIDATES.includes(row.category) && row.tradeCount >= INSIGHT_RULES.minimumPromotedSample);
  return rows.sort((a, b) => a.netPnl - b.netPnl || a.averagePnl - b.averagePnl || b.tradeCount - a.tradeCount)[0] || null;
}

export function selectMostExpensiveViolation(trades) {
  return buildRuleViolationAnalysis(trades).filter((row) => row.tradeCount >= INSIGHT_RULES.minimumPromotedSample && row.netPnl < 0).sort((a, b) => a.netPnl - b.netPnl || b.tradeCount - a.tradeCount)[0] || null;
}

export function selectAlignmentInsight(trades) {
  const combined = buildCombinedAlignment(trades).filter((row) => row.category !== "Unknown" && row.tradeCount >= INSIGHT_RULES.minimumPromotedSample && row.averagePnl !== null).sort((a, b) => b.averagePnl - a.averagePnl || (b.winRate ?? 0) - (a.winRate ?? 0));
  if (combined[0]) return { ...combined[0], source: "QQQ + SPY" };
  const singles = ["qqq_alignment", "spy_alignment"].flatMap((field) => {
    const label = field.startsWith("qqq") ? "QQQ" : "SPY";
    const groups = new Map();
    trades.forEach((trade) => { if (trade[field]) { if (!groups.has(trade[field])) groups.set(trade[field], []); groups.get(trade[field]).push(trade); } });
    return [...groups.entries()].map(([category, matching]) => ({ category: `${label} ${category}`, source: label, ...summarizeTrades(matching) }));
  }).filter((row) => row.tradeCount >= INSIGHT_RULES.minimumPromotedSample);
  return singles.sort((a, b) => b.averagePnl - a.averagePnl || (b.winRate ?? 0) - (a.winRate ?? 0))[0] || null;
}

export function selectRoomInsights(trades) {
  const eligible = buildRoomAnalysis(trades).filter((row) => row.category !== "Unknown" && row.tradeCount >= INSIGHT_RULES.minimumPromotedSample && row.averagePnl !== null);
  return {
    best: [...eligible].sort((a, b) => b.averagePnl - a.averagePnl || (b.winRate ?? 0) - (a.winRate ?? 0))[0] || null,
    weakest: [...eligible].sort((a, b) => a.averagePnl - b.averagePnl || (a.winRate ?? 0) - (b.winRate ?? 0))[0] || null,
  };
}

export function analyzeRunnerContribution(trades) {
  const rows = trades.map((trade) => {
    const runnerPnl = calculateScalePnl({ direction: trade.direction, entryPrice: trade.entry_price, exitPrice: trade.runner_exit_price, shares: trade.runner_shares });
    const firstPnl = calculateScalePnl({ direction: trade.direction, entryPrice: trade.entry_price, exitPrice: trade.first_scale_price, shares: trade.first_scale_shares });
    const total = runnerPnl === null || firstPnl === null ? null : runnerPnl + firstPnl;
    return { pnl: runnerPnl, contribution: total && runnerPnl !== null ? (runnerPnl / total) * 100 : null };
  }).filter((row) => row.pnl !== null);
  if (!rows.length) return null;
  const contributions = rows.map((row) => Number(row.contribution)).filter(Number.isFinite);
  const totalPnl = rows.reduce((sum, row) => sum + row.pnl, 0);
  return { tradeCount: rows.length, positiveCount: rows.filter((row) => row.pnl > 0).length, totalRunnerPnl: rounded(totalPnl, 2), averageContribution: contributions.length ? rounded(contributions.reduce((sum, value) => sum + value, 0) / contributions.length) : null, sampleLabel: getSampleSizeLabel(rows.length) };
}

export function buildDataCompleteness(trades = []) {
  const definitions = [
    ["Break & Retest Review", (trade) => trade.break_retest_setup !== null && trade.break_retest_setup !== undefined],
    ["Retest Quality", (trade) => Boolean(trade.retest_quality)],
    ["Execution Quality", (trade) => Boolean(trade.execution_quality)],
    ["Rule Review", (trade) => trade.rule_adherence_score !== null && trade.rule_adherence_score !== undefined],
  ];
  return definitions.map(([category, predicate]) => {
    const completed = trades.filter(predicate).length;
    return { category, completed, total: trades.length, percentage: trades.length ? rounded((completed / trades.length) * 100) : null };
  });
}

export function buildTickerInsights(trades) {
  const eligible = buildTickerAnalysis(trades).filter((row) => row.tradeCount >= INSIGHT_RULES.minimumPromotedSample);
  return {
    best: [...eligible].sort((a, b) => b.averagePnl - a.averagePnl || b.tradeCount - a.tradeCount)[0] || null,
    weakest: [...eligible].sort((a, b) => a.averagePnl - b.averagePnl || b.tradeCount - a.tradeCount)[0] || null,
    consistent: [...eligible].filter((row) => row.averageRuleAdherence !== null).sort((a, b) => b.averageRuleAdherence - a.averageRuleAdherence || b.tradeCount - a.tradeCount)[0] || null,
  };
}

function insight(id, category, title, description, row, priority, severity = "neutral", metric = null, comparison = null) {
  return { id, category, title, description, metric, comparison, sampleSize: row?.tradeCount ?? 0, sampleLabel: row?.sampleLabel || getSampleSizeLabel(row?.tradeCount ?? 0), severity, priority, confidenceLevel: row?.tradeCount >= 20 ? "More Meaningful" : row?.tradeCount >= 10 ? "Developing" : "Low", supportingData: row || null };
}

export function rankInsights(insights, maximum = INSIGHT_RULES.maximumVisibleInsights) {
  const ranked = [...insights].filter(Boolean).sort((a, b) => b.priority - a.priority || b.sampleSize - a.sampleSize);
  return { visible: ranked.slice(0, maximum), additional: ranked.slice(maximum), all: ranked };
}

export function generateActionableInsights(trades = []) {
  if (!trades.length) return { visible: [], additional: [], all: [], rolling: buildRollingMetrics([]), streaks: calculateProcessStreaks([]), dataCompleteness: buildDataCompleteness([]) };
  const patterns = selectSetupPatterns(trades);
  const leak = selectExecutionLeak(trades);
  const expensive = selectMostExpensiveViolation(trades);
  const alignment = selectAlignmentInsight(trades);
  const room = selectRoomInsights(trades);
  const runner = analyzeRunnerContribution(trades);
  const rolling = buildRollingMetrics(trades);
  const tickers = buildTickerInsights(trades);
  const completeness = buildDataCompleteness(trades);
  const overall = summarizeTrades(trades);
  const processPercentage = goodProcessPercentage(trades);
  const exitComparison = rolling.comparisons.find((item) => item.metric === "averageExitEfficiency");
  const deteriorating = rolling.comparisons.filter((item) => item.direction === "Deteriorating" && rolling.historical.length >= INSIGHT_RULES.minimumPromotedSample).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))[0];
  const cards = [];
  if (patterns.strongest) cards.push(insight("strongest-setup", "Strengths", "Strongest Observed Setup Pattern", `${patterns.strongest.category} has the highest sample-qualified average P&L in the current filters.`, patterns.strongest, 75, "positive", patterns.strongest.averagePnl));
  if (patterns.weakest && patterns.weakest.category !== patterns.strongest?.category) cards.push(insight("weakest-setup", "Setup Patterns", "Weakest Observed Setup Pattern", `${patterns.weakest.category} has the lowest sample-qualified average P&L in the current filters.`, patterns.weakest, 82, "warning", patterns.weakest.averagePnl));
  if (leak) cards.push(insight("execution-leak", "Execution Leaks", "Biggest Execution Leak", `${leak.category} has the most damaging combined occurrence, net P&L, and average P&L profile among reviewed execution behaviors.`, leak, 98, "negative", leak.netPnl));
  if (expensive) cards.push(insight("expensive-violation", "Rule Violations", "Most Expensive Rule Violation", `${expensive.category} has the largest negative observed P&L impact. Financial impact overlaps when a trade contains multiple violations.`, expensive, 96, "negative", expensive.netPnl));
  if (alignment) cards.push(insight("market-context", "Market Context Patterns", "Best Observed Market Context", `${alignment.category} has the strongest sample-qualified average P&L among reviewed alignment categories.`, alignment, 68, "positive", alignment.averagePnl));
  if (room.best) cards.push(insight("best-room", "Setup Patterns", "Best Observed Room", `${room.best.category} has the strongest sample-qualified average P&L among room-to-next-level buckets.`, room.best, 66, "positive", room.best.averagePnl));
  if (room.weakest && room.weakest.category !== room.best?.category) cards.push(insight("weak-room", "Setup Patterns", "Weakest Observed Room", `${room.weakest.category} has the weakest sample-qualified average P&L among room buckets.`, room.weakest, 72, "warning", room.weakest.averagePnl));
  if (runner) cards.push(insight("runner", "Trade Management", "Runner Contribution", `Runners added positive P&L in ${runner.positiveCount} of ${runner.tradeCount} scaled trades.`, runner, 64, runner.totalRunnerPnl < 0 ? "warning" : "positive", runner.totalRunnerPnl));
  if (overall.averageExitEfficiency !== null && trades.length >= INSIGHT_RULES.minimumPromotedSample) cards.push(insight("exit-efficiency", "Trade Management", "Exit Efficiency", exitComparison?.direction !== "N/A" ? `Recent exit efficiency is ${exitComparison.recent}% versus ${exitComparison.historical}% historically (${exitComparison.difference >= 0 ? "+" : ""}${exitComparison.difference} points).` : `Average exit efficiency is ${overall.averageExitEfficiency}% across filtered trades; no adequate recent-versus-historical comparison is available.`, overall, 70, exitComparison?.direction === "Deteriorating" ? "warning" : "neutral", overall.averageExitEfficiency, exitComparison?.historical));
  if (processPercentage !== null) cards.push(insight("process-quality", "Strengths", "Process Quality Snapshot", `Good Process accounts for ${processPercentage}% and Poor Process for ${rounded(100 - processPercentage)}% of classified filtered trades. Average rule adherence is ${overall.averageRuleAdherence ?? "N/A"}, and average execution score is ${overall.averageExecutionScore ?? "N/A"}.`, overall, 62, "neutral", processPercentage));
  if (deteriorating) cards.push(insight("recent-trend", "Recent Trends", "Recent Process Metric Deteriorating", `${deteriorating.metric} is below the historical baseline by ${Math.abs(deteriorating.difference)}.`, { tradeCount: rolling.recent.length, sampleLabel: rolling.recentStats.sampleLabel }, 90, "warning", deteriorating.recent, deteriorating.historical));
  if (tickers.best) cards.push(insight("best-ticker", "Strengths", "Best Observed Ticker", `${tickers.best.category} has the strongest sample-qualified average P&L.`, tickers.best, 55, "positive", tickers.best.averagePnl));
  if (tickers.weakest && tickers.weakest.category !== tickers.best?.category) cards.push(insight("weak-ticker", "Setup Patterns", "Weakest Observed Ticker", `${tickers.weakest.category} has the weakest sample-qualified average P&L.`, tickers.weakest, 60, "warning", tickers.weakest.averagePnl));
  if (tickers.consistent && tickers.consistent.category !== tickers.best?.category) cards.push(insight("consistent-ticker", "Strengths", "Most Consistent Ticker", `${tickers.consistent.category} has the highest sample-qualified average rule adherence (${tickers.consistent.averageRuleAdherence}).`, tickers.consistent, 54, "positive", tickers.consistent.averageRuleAdherence));
  completeness.filter((row) => row.percentage !== null && row.percentage < 60).forEach((row) => cards.push(insight(`data-${row.category}`, "Data Quality / Sample Warnings", `${row.category} Completion`, `Only ${row.completed} of ${row.total} filtered trades (${row.percentage}%) contain this review data. Treat related analytics as preliminary.`, { tradeCount: row.completed, sampleLabel: getSampleSizeLabel(row.completed) }, 85, "warning", row.percentage)));
  return { ...rankInsights(cards), rolling, streaks: calculateProcessStreaks(rolling.recent), dataCompleteness: completeness, tickers, runner };
}

function mondayFor(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date.toISOString().slice(0, 10);
}

export function listTradingWeeks(trades = [], today = new Date()) {
  const todayIso = today.toISOString().slice(0, 10);
  return [...new Set(trades.map((trade) => trade.trade_date || trade.date).filter(Boolean).map(mondayFor))]
    .filter((weekStart) => { const end = new Date(`${weekStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 4); return end.toISOString().slice(0, 10) < todayIso; })
    .sort().reverse();
}

export function buildWeeklyReview(trades = [], weekStart) {
  if (!weekStart) return null;
  const end = new Date(`${weekStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 4);
  const weekEnd = end.toISOString().slice(0, 10);
  const matching = trades.filter((trade) => { const date = trade.trade_date || trade.date || ""; return date >= weekStart && date <= weekEnd; });
  const stats = summarizeTrades(matching);
  const violations = buildRuleViolationAnalysis(matching).sort((a, b) => b.tradeCount - a.tradeCount)[0] || null;
  const pattern = selectSetupPatterns(matching, 1).strongest;
  const processMetrics = [
    { label: "Rule Adherence", value: stats.averageRuleAdherence },
    { label: "Execution Score", value: stats.averageExecutionScore },
    { label: "Exit Efficiency", value: stats.averageExitEfficiency },
  ].filter((item) => item.value !== null).sort((a, b) => a.value - b.value);
  return { weekStart, weekEnd, trades: matching, ...stats, goodProcessPercentage: goodProcessPercentage(matching), mostCommonViolation: violations?.category || null, strongestPattern: pattern?.category || null, processImprovementArea: processMetrics[0]?.label || null };
}

export function formatWeeklyReview(review) {
  if (!review) return "";
  const money = review.netPnl === null ? "N/A" : `${review.netPnl >= 0 ? "+" : "-"}$${Math.abs(review.netPnl).toFixed(2)}`;
  const percent = (value) => value === null || value === undefined ? "N/A" : `${value}%`;
  return ["Weekly Trading Review", `${review.weekStart} to ${review.weekEnd}`, "", `Trades: ${review.tradeCount}`, `Net P&L: ${money}`, `Win Rate: ${percent(review.winRate)}`, `Good Process: ${percent(review.goodProcessPercentage)}`, `Rule Adherence: ${review.averageRuleAdherence ?? "N/A"}`, `Execution Score: ${review.averageExecutionScore ?? "N/A"}`, `Exit Efficiency: ${percent(review.averageExitEfficiency)}`, "", `Strongest observed pattern: ${review.strongestPattern || "N/A"}`, `Primary process leak: ${review.mostCommonViolation || review.processImprovementArea || "N/A"}`].join("\n");
}
