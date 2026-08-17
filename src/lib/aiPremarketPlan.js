import { supabase } from "./supabase";

export const AI_TICKER_LIMIT = 10;
export const AI_DRAFT_STALE_MS = 30 * 60 * 1000;
export const AI_CONFIDENCE_OPTIONS = ["Low", "Medium", "High"];
export const AI_DIRECTION_OPTIONS = ["Long", "Short", "Both", "Neutral"];

export function normalizeAiTickers(input) {
  const values = Array.isArray(input) ? input : String(input || "").split(/[\s,]+/);
  const normalized = [...new Set(values.map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
  const invalid = normalized.find((ticker) => !/^[A-Z][A-Z0-9.-]{0,14}$/.test(ticker));
  if (invalid) throw new Error(`Invalid ticker: ${invalid}`);
  if (normalized.length > AI_TICKER_LIMIT) throw new Error(`Choose no more than ${AI_TICKER_LIMIT} tickers.`);
  return normalized;
}

export function isAiDraftStale(generatedAt, now = Date.now()) {
  const timestamp = Date.parse(generatedAt);
  return Number.isFinite(timestamp) && now - timestamp >= AI_DRAFT_STALE_MS;
}

export function mapAiDraftToApproval(draft, tradeDate) {
  const indexes = Object.fromEntries((draft.indexes || []).map((item) => [item.ticker, item]));
  const marketDay = { trade_date: tradeDate, market_condition: draft.overall.marketCondition, expected_trading_day: draft.overall.expectedTradingDay, notes: draft.overall.notes };
  for (const ticker of ["QQQ", "SPY"]) {
    const source = indexes[ticker];
    if (!source) throw new Error(`AI draft is missing ${ticker}.`);
    const prefix = ticker.toLowerCase();
    Object.assign(marketDay, {
      [`${prefix}_bias`]: source.dailyBias,
      [`${prefix}_weekly_bias`]: source.weeklyBias,
      [`${prefix}_daily_bias`]: source.dailyBias,
      [`${prefix}_market_environment`]: source.marketEnvironment,
      [`${prefix}_pdh`]: source.levels.pdh,
      [`${prefix}_pdl`]: source.levels.pdl,
      [`${prefix}_liquidity_target`]: source.liquidityTarget,
      [`${prefix}_most_important_level`]: source.mostImportantLevel,
      [`${prefix}_bull_trigger`]: source.bullTrigger,
      [`${prefix}_bear_trigger`]: source.bearTrigger,
      [`${prefix}_game_plan`]: source.gamePlan,
    });
  }
  return {
    marketDay,
    watchlist: (draft.watchlist || []).filter((item) => item.dataAvailable !== false).map((item, index) => ({
      trade_date: tradeDate, ticker: item.ticker, priority: index + 1,
      weekly_bias: item.weeklyBias, daily_bias: item.dailyBias, relative_strength: item.relativeStrength,
      direction: item.preferredDirection, confidence: item.confidence,
      long_scenario_enabled: item.longScenarioEnabled, long_setup: item.longPlan, long_trigger: item.longTrigger,
      long_invalidation: item.longInvalidation,
      short_scenario_enabled: item.shortScenarioEnabled, short_setup: item.shortPlan, short_trigger: item.shortTrigger,
      short_invalidation: item.shortInvalidation, bottom_line: item.bottomLine,
      pdh: item.levels?.pdh, pdl: item.levels?.pdl, atr: item.levels?.atr,
    })),
    metadata: { generation_source: draft.metadata.generationSource || "ai_assisted", ai_generated_at: draft.metadata.generatedAt, ai_model: draft.metadata.model || null, ai_data_as_of: draft.metadata.dataAsOf, ai_prompt_version: draft.metadata.promptVersion, premarket_data_included: false },
  };
}

export async function approveAiPremarketPlan(draft, tradeDate) {
  const payload = mapAiDraftToApproval(draft, tradeDate);
  const { data, error } = await supabase.rpc("approve_ai_premarket_plan", { p_trade_date: tradeDate, p_market_day: payload.marketDay, p_watchlist: payload.watchlist, p_metadata: payload.metadata });
  if (error) throw error;
  return data;
}
