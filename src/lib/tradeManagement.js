export const SETUP_QUALITY_VALUES = ["A+", "A", "B", "C", "D"];
export const EXECUTION_QUALITY_VALUES = ["Excellent", "Good", "Average", "Poor"];

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

export function calculatePositionPercent(shares, initialShares) {
  const quantity = numberOrNull(shares);
  const initial = numberOrNull(initialShares);
  if (quantity === null || initial === null || quantity < 0 || initial <= 0 || quantity > initial) {
    return null;
  }
  return rounded((quantity / initial) * 100);
}

export function isValidPercentage(value) {
  const number = numberOrNull(value);
  return number !== null && number >= 0 && number <= 100;
}

export function isValidExecutionScore(value) {
  const number = numberOrNull(value);
  return number !== null && number >= 0 && number <= 100;
}

export function isValidSetupQuality(value) {
  return value === null || value === "" || SETUP_QUALITY_VALUES.includes(value);
}

export function isValidExecutionQuality(value) {
  return value === null || value === "" || EXECUTION_QUALITY_VALUES.includes(value);
}

function isExitOrder(order, direction) {
  const side = String(order?.side || "").toLowerCase();
  return direction === "Short" ? side.includes("buy") : side.includes("sell");
}

function groupExactExitFills(orders) {
  return orders.reduce((groups, order) => {
    const quantity = numberOrNull(order.quantity);
    const price = numberOrNull(order.price);
    if (quantity === null || quantity <= 0 || price === null || price <= 0) return groups;

    const key = `${order.timestamp ?? ""}|${order.time ?? ""}|${order.side ?? ""}|${price}`;
    const previous = groups.at(-1);
    if (previous?.key === key) {
      previous.shares += quantity;
      previous.value += quantity * price;
    } else {
      groups.push({ key, shares: quantity, value: quantity * price });
    }
    return groups;
  }, []);
}

export function deriveScaleOutFromOrders(trade = {}) {
  const initialShares = numberOrNull(trade.shares);
  const direction = String(trade.direction || "").trim();
  if (initialShares === null || initialShares <= 0 || !["Long", "Short"].includes(direction)) return null;

  const exits = (trade.orders || []).filter((order) => isExitOrder(order, direction));
  const exitGroups = groupExactExitFills(exits);
  if (exitGroups.length < 2) return null;

  const totalExitShares = exitGroups.reduce((sum, exit) => sum + exit.shares, 0);
  if (Math.abs(totalExitShares - initialShares) > 0.000001) return null;

  const first = exitGroups[0];
  const runnerGroups = exitGroups.slice(1);
  const runnerShares = runnerGroups.reduce((sum, exit) => sum + exit.shares, 0);
  const runnerValue = runnerGroups.reduce((sum, exit) => sum + exit.value, 0);

  return {
    first_scale_price: rounded(first.value / first.shares),
    first_scale_shares: rounded(first.shares, 6),
    first_scale_percent: calculatePositionPercent(first.shares, initialShares),
    runner_exit_price: rounded(runnerValue / runnerShares),
    runner_shares: rounded(runnerShares, 6),
    runner_percent: calculatePositionPercent(runnerShares, initialShares),
  };
}

export function calculateScalePnl({ direction, entryPrice, exitPrice, shares }) {
  const entry = numberOrNull(entryPrice);
  const exit = numberOrNull(exitPrice);
  const quantity = numberOrNull(shares);
  if (entry === null || exit === null || quantity === null || quantity < 0) return null;
  const move = direction === "Short" ? entry - exit : exit - entry;
  return rounded(move * quantity);
}

export function getManagementSummary(trade = {}) {
  const firstScalePnl = calculateScalePnl({
    direction: trade.direction,
    entryPrice: trade.entry_price,
    exitPrice: trade.first_scale_price,
    shares: trade.first_scale_shares,
  });
  const runnerPnl = calculateScalePnl({
    direction: trade.direction,
    entryPrice: trade.entry_price,
    exitPrice: trade.runner_exit_price,
    shares: trade.runner_shares,
  });
  const total = firstScalePnl === null || runnerPnl === null ? null : firstScalePnl + runnerPnl;

  return {
    firstScaleDeviation: difference(trade.first_scale_price, trade.planned_first_scale_price),
    runnerDeviation: difference(trade.runner_exit_price, trade.planned_runner_target),
    firstScalePnl,
    runnerPnl,
    runnerContribution: total === null || total === 0 ? null : rounded((runnerPnl / total) * 100, 1),
  };
}

function difference(actual, planned) {
  const actualNumber = numberOrNull(actual);
  const plannedNumber = numberOrNull(planned);
  return actualNumber === null || plannedNumber === null ? null : rounded(actualNumber - plannedNumber);
}

export function validateTradeManagement(updates = {}) {
  const percentageFields = [
    "first_scale_percent", "runner_percent", "planned_first_scale_percent", "planned_runner_percent",
  ];
  for (const field of percentageFields) {
    if (field in updates && updates[field] !== "" && updates[field] !== null && !isValidPercentage(updates[field])) {
      throw new Error(`${field.replaceAll("_", " ")} must be between 0 and 100.`);
    }
  }
  if ("execution_score" in updates && updates.execution_score !== "" && updates.execution_score !== null && !isValidExecutionScore(updates.execution_score)) {
    throw new Error("Execution score must be between 0 and 100.");
  }
  if ("setup_quality" in updates && !isValidSetupQuality(updates.setup_quality)) throw new Error("Invalid setup quality.");
  if ("execution_quality" in updates && !isValidExecutionQuality(updates.execution_quality)) throw new Error("Invalid execution quality.");
}

