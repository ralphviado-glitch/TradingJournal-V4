const value = (input) => input === null || input === undefined || input === "" || !Number.isFinite(Number(input)) ? null : Number(input);

// Precedence: explicit broker/net, calculated gross-minus-fees, legacy pnl, gross fallback.
export function getAuthoritativePnl(trade = {}) {
  const net = value(trade.net_pnl ?? trade.broker_pnl); if (net !== null) return net;
  const gross = value(trade.gross_pnl); const fees = value(trade.fees);
  if (gross !== null && fees !== null) return Number((gross - fees).toFixed(2));
  return value(trade.pnl) ?? gross;
}

export function applyFees(trade = {}, input) {
  const fees = value(input); const gross = value(trade.gross_pnl ?? trade.pnl);
  const net = fees !== null && gross !== null ? Number((gross - fees).toFixed(2)) : null;
  return { fees, net_pnl: net, pnl: net ?? trade.pnl, pnl_source: net !== null ? "calculated_net" : (trade.pnl_source || "gross_only") };
}
