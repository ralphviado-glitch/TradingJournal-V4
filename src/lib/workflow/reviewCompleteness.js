export const REVIEW_REQUIREMENTS = [
  { key: "setupQuality", label: "Setup Quality", complete: (trade) => Boolean(trade.setup_quality) },
  { key: "executionQuality", label: "Execution Quality", complete: (trade) => Boolean(trade.execution_quality) },
  { key: "setupReview", label: "Break & Retest Classification", complete: (trade) => trade.break_retest_setup !== null && trade.break_retest_setup !== undefined },
  { key: "ruleReview", label: "Rule Review", complete: (trade) => trade.rule_adherence_score !== null && trade.rule_adherence_score !== undefined },
  { key: "reviewNotes", label: "Review Notes", complete: (trade) => Boolean(String(trade.setup_review_notes || trade.notes || "").trim()) },
];

export function getTradeReviewCompleteness(trade = {}) {
  if (trade.quick_review_completed_at || trade.review_status === "Reviewed") return { status: "Reviewed", completedFields: 5, totalRequiredFields: 5, percentage: 100, missingFields: [] };
  const completed = REVIEW_REQUIREMENTS.filter((item) => item.complete(trade));
  const missing = REVIEW_REQUIREMENTS.filter((item) => !item.complete(trade));
  const percentage = Math.round((completed.length / REVIEW_REQUIREMENTS.length) * 100);
  return {
    status: completed.length === 0 ? "Not Reviewed" : missing.length === 0 ? "Review Complete" : "Partially Reviewed",
    completedFields: completed.length, totalRequiredFields: REVIEW_REQUIREMENTS.length,
    percentage, missingFields: missing.map((item) => item.label),
  };
}

export function buildReviewQueue(trades = []) {
  return trades.map((trade) => ({ trade, completeness: getTradeReviewCompleteness(trade) }))
    .filter((item) => item.completeness.status !== "Review Complete")
    .sort((a, b) => String(a.trade.trade_date || a.trade.date || "").localeCompare(String(b.trade.trade_date || b.trade.date || "")) || String(a.trade.entry_time || "").localeCompare(String(b.trade.entry_time || "")))
    .map((item) => item.trade);
}

export function getNextIncompleteTrade(trades, currentTradeId) {
  const queue = buildReviewQueue(trades);
  if (!currentTradeId) return queue[0]?.trade || null;
  const index = queue.findIndex((trade) => trade.id === currentTradeId);
  return queue[index + 1] || queue.find((trade) => trade.id !== currentTradeId) || null;
}
