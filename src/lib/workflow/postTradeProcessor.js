import { calculateTradeExcursions } from "../excursionService";
import { updateTrade } from "../tradeService";
import { getWatchlistForDates } from "../watchlistService";
import { deriveScaleOutFromOrders } from "../tradeManagement";
import { getTradeReviewCompleteness } from "./reviewCompleteness";
import { matchTradeToWatchlist } from "./watchlistMatcher";

export const POST_TRADE_CONCURRENCY = 2;

function excursionFailure(error) {
  const message = String(error?.message || error || "Market data unavailable.");
  return { status: /429|rate limit|quota/i.test(message) ? "Unavailable" : "Failed", message };
}

export function getManagementEnrichment(trade) {
  const derived = deriveScaleOutFromOrders(trade);
  if (derived) return { management_status: "Derived", ...derived };
  if ((trade.orders || []).length >= 2) return { management_status: "Not Applicable" };
  return { management_status: "Manual Review" };
}

export async function processImportedTrade(trade, watchlistItems = [], dependencies = {}) {
  const calculateExcursions = dependencies.calculateExcursions || calculateTradeExcursions;
  const saveTrade = dependencies.updateTrade || updateTrade;
  const management = getManagementEnrichment(trade);
  const watchlist = watchlistItems == null
    ? { status: "Not Checked", payload: { watchlist_match_status: "Not Checked", watchlist_item_id: null, planned_trade: null } }
    : matchTradeToWatchlist(trade, watchlistItems);
  const errors = [];
  let excursionUpdates = {};
  let excursionStatus;

  try {
    excursionUpdates = await calculateExcursions(trade);
    excursionStatus = "Calculated";
  } catch (error) {
    const failure = excursionFailure(error);
    excursionStatus = failure.status;
    errors.push(`Market data: ${failure.message}`);
  }

  const review = getTradeReviewCompleteness(trade);
  const updates = {
    ...management, ...watchlist.payload, ...excursionUpdates,
    excursion_status: excursionStatus,
    review_status: review.status,
    processing_status: excursionStatus === "Calculated" ? "Complete" : "Partial",
    processing_error: errors.length ? errors.join(" ") : null,
  };
  const savedTrade = await saveTrade(trade.id, updates);
  return { trade: savedTrade, statuses: { processing: updates.processing_status, excursion: excursionStatus, management: management.management_status, watchlist: watchlist.status, review: review.status }, errors };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) { const index = nextIndex; nextIndex += 1; results[index] = await worker(items[index]); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export function summarizeProcessing(results = []) {
  return {
    processedCount: results.filter((item) => item.trade).length,
    excursionsCalculated: results.filter((item) => item.statuses?.excursion === "Calculated").length,
    excursionsPendingOrFailed: results.filter((item) => item.statuses?.excursion !== "Calculated").length,
    scaleOutsDetected: results.filter((item) => item.statuses?.management === "Derived").length,
    manualManagementReview: results.filter((item) => item.statuses?.management === "Manual Review").length,
    watchlistMatches: results.filter((item) => item.statuses?.watchlist === "Matched").length,
    unmatchedTrades: results.filter((item) => item.statuses?.watchlist === "No Match").length,
    tradesRequiringReview: results.filter((item) => item.statuses?.review !== "Review Complete").length,
  };
}

export async function processImportedTrades(trades = [], dependencies = {}) {
  const loadWatchlist = dependencies.getWatchlistForDates || getWatchlistForDates;
  let watchlistItems = [];
  try { watchlistItems = await loadWatchlist(trades.map((trade) => trade.trade_date || trade.date)); } catch { watchlistItems = null; }
  const results = await mapWithConcurrency(trades, dependencies.concurrency || POST_TRADE_CONCURRENCY, async (trade) => {
    try { return await processImportedTrade(trade, watchlistItems, dependencies); }
    catch (error) { return { trade, statuses: { processing: "Failed", excursion: "Pending", management: "Failed", watchlist: "Not Checked", review: getTradeReviewCompleteness(trade).status }, errors: [String(error?.message || error)] }; }
  });
  return { trades: results.map((item) => item.trade), results, summary: summarizeProcessing(results) };
}
