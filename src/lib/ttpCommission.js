export const TTP_COMMISSION_PER_SHARE = 0.005;
export const TTP_MINIMUM_COMMISSION = 0.75;

export function calculateTtpExecutionCommission(quantity) {
  const shares = Math.abs(Number(quantity));
  if (!Number.isFinite(shares) || shares <= 0) return null;
  return Number(Math.max(shares * TTP_COMMISSION_PER_SHARE, TTP_MINIMUM_COMMISSION).toFixed(2));
}

export function getExecutionIdentity(order = {}) {
  return [order.account, order.login, order.orderId || `source:${order.sourceIndex}`, order.timestampUtc || order.timestamp,
    String(order.ticker || "").toUpperCase(), String(order.side || "").toLowerCase(), Number(order.quantity), Number(order.price)].join("|");
}

export function deduplicateFilledExecutions(orders = []) {
  const seen = new Set(); const duplicates = []; const executions = [];
  orders.forEach((order) => {
    const key = getExecutionIdentity(order);
    if (seen.has(key)) duplicates.push(order);
    else { seen.add(key); executions.push({ ...order, executionCommission: calculateTtpExecutionCommission(order.quantity) }); }
  });
  return { executions, duplicates };
}
