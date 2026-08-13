import { getTradeReviewCompleteness } from "./reviewCompleteness";

export function getDailyCompletion(trades = []) {
  const reviews = trades.map(getTradeReviewCompleteness);
  const processingPending = trades.filter((trade) => [null, "Pending", "Processing"].includes(trade.processing_status)).length;
  const reviewComplete = reviews.filter((item) => item.status === "Review Complete").length;
  const excursionCalculated = trades.filter((trade) => trade.excursion_status === "Calculated").length;
  const watchlistMatches = trades.filter((trade) => trade.watchlist_match_status === "Matched").length;
  const ruleReviews = trades.filter((trade) => trade.rule_adherence_score !== null && trade.rule_adherence_score !== undefined).length;
  const managementReviewed = trades.filter((trade) => ["Derived", "Not Applicable"].includes(trade.management_status) || trade.management_notes).length;
  const blocking = trades.filter((trade) => trade.processing_status === "Failed").length;
  const status = !trades.length ? "No Trades" : processingPending ? "In Progress" : reviewComplete < trades.length ? "Needs Review" : "Complete";
  return { totalTrades: trades.length, netPnl: Number(trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0).toFixed(2)), reviewComplete, reviewPending: trades.length - reviewComplete, excursionCalculated, excursionPending: trades.length - excursionCalculated, watchlistMatches, unplannedTrades: trades.filter((trade) => trade.planned_trade === false).length, ruleReviews, managementReviewed, processingPending, blockingProcessingIssues: blocking, status };
}

