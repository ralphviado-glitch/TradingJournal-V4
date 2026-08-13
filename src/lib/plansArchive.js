export function buildPlanArchive(plans = [], watchlist = [], trades = []) {
  return plans.map((plan) => {
    const planWatchlist = watchlist.filter((item) => item.trade_date === plan.trade_date);
    const planTrades = trades.filter((trade) => (trade.trade_date || trade.date) === plan.trade_date);
    const wins = planTrades.filter((trade) => Number(trade.pnl) > 0).length;
    return {
      ...plan,
      watchlist: planWatchlist,
      trades: planTrades,
      summary: {
        tradesTaken: planTrades.length,
        netPnl: Number(planTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0).toFixed(2)),
        winRate: planTrades.length ? Number(((wins / planTrades.length) * 100).toFixed(1)) : null,
        plannedTrades: planTrades.filter((trade) => trade.planned_trade === true).length,
        unplannedTrades: planTrades.filter((trade) => trade.planned_trade === false).length,
        directionMatches: planTrades.filter((trade) => trade.direction_matched === true).length,
        reviewsComplete: planTrades.filter((trade) => trade.review_status === "Review Complete").length,
      },
    };
  }).sort((a, b) => b.trade_date.localeCompare(a.trade_date));
}

export function filterPlanArchive(plans, filters = {}) {
  const ticker = String(filters.ticker || "").trim().toUpperCase();
  return plans.filter((plan) => (!filters.dateFrom || plan.trade_date >= filters.dateFrom) &&
    (!filters.dateTo || plan.trade_date <= filters.dateTo) &&
    (!filters.marketCondition || plan.market_condition === filters.marketCondition) &&
    (!filters.completed || (filters.completed === "yes") === Boolean(plan.trading_day_completed_at)) &&
    (!ticker || plan.watchlist.some((item) => String(item.ticker || "").toUpperCase().includes(ticker))));
}

export function removePlanFromArchive(plans, tradeDate) {
  return plans.filter((plan) => plan.trade_date !== tradeDate);
}
