import { getPlanDirectionResult, preferredDirectionMatch } from "./planDirection";

export const directionMatch = preferredDirectionMatch;

const snapshotFields = ["overall_rating", "weekly_bias", "intraday_bias", "relative_strength", "confidence", "long_scenario_enabled", "long_trigger", "long_setup", "long_target", "long_invalidation", "short_scenario_enabled", "short_trigger", "short_setup", "short_target", "short_invalidation", "bottom_line"];

export function buildWatchlistLinkPayload(item, trade) {
  if (!item) return { watchlist_item_id: null, planned_trade: false, watchlist_match_status: "No Match", watchlist_rank: null, planned_direction: null, direction_matched: null, planned_setup: null, planned_key_levels: null, planned_notes: null };
  const result = getPlanDirectionResult(item, trade.direction);
  return { watchlist_item_id: item.id, planned_trade: true, watchlist_match_status: "Matched", watchlist_rank: item.priority ?? null, planned_direction: item.direction || null, direction_matched: result.preferredMatch, preferred_direction_matched: result.preferredMatch, planned_scenario_matched: result.scenarioMatch, plan_direction_classification: result.classification, planned_setup: item.setup || null, planned_key_levels: item.key_levels || null, planned_notes: item.notes || null, ...Object.fromEntries(snapshotFields.map((field) => [`planned_${field}`, item[field] ?? null])) };
}

export function matchTradeToWatchlist(trade, items = []) {
  const date = trade.trade_date || trade.date;
  const ticker = String(trade.ticker || "").trim().toUpperCase();
  const matches = items.filter((item) => (item.trade_date || item.date) === date && String(item.ticker || "").trim().toUpperCase() === ticker);
  if (matches.length === 1) return { status: "Matched", payload: buildWatchlistLinkPayload(matches[0], trade), matches };
  if (matches.length > 1) return { status: "Ambiguous", payload: { watchlist_match_status: "Ambiguous", planned_trade: null, watchlist_item_id: null }, matches };
  return { status: "No Match", payload: buildWatchlistLinkPayload(null, trade), matches: [] };
}
