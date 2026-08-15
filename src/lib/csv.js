import { tradeThePoolTimestampToNewYork } from "./marketTime";
import { deduplicateFilledExecutions } from "./ttpCommission";

const EPSILON = 1e-7;
const text = (value) => String(value || "").trim();
function number(value) {
  if (value == null || value === "") return 0;
  const negative = /^\s*\(.*\)\s*$/.test(String(value));
  const parsed = Number(String(value).replace(/,/g, "").replace(/USD/gi, "").replace(/\$/g, "").replace(/[()]/g, "").trim());
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : 0;
}

export function parseCurrencyNotional(value) {
  if (value == null || text(value) === "") return null;
  const parsed = number(value);
  return parsed > 0 ? parsed : null;
}

function inferPrice(row, side, quantity) {
  const explicit = number(row.Price) || number(row["Stop price"]);
  if (explicit > 0) return { price: explicit, priceInferred: false, priceSource: "price" };
  if (!(quantity > 0)) return { price: 0, priceInferred: false, priceSource: null };
  const sell = /sell|short/i.test(side);
  const candidates = sell ? [[row.Bought, "bought_notional"], [row.Sold, "sold_notional"]] : [[row.Sold, "sold_notional"], [row.Bought, "bought_notional"]];
  for (const [value, source] of candidates) {
    const notional = parseCurrencyNotional(value);
    if (notional !== null) return { price: Number((notional / quantity).toFixed(8)), priceInferred: true, priceSource: source };
  }
  return { price: 0, priceInferred: false, priceSource: null };
}

export function normalizeBrokerOrders(rows = []) {
  return rows.map((row, sourceIndex) => {
    const normalized = tradeThePoolTimestampToNewYork(text(row["Date/Time"]));
    const quantity = number(row.Quantity); const side = text(row.Side);
    return { date: normalized?.date || "", time: normalized?.time || "", timestamp: normalized?.timestamp ?? NaN,
      timestampUtc: normalized?.timestampUtc || "", ticker: text(row.Symbol), side, type: text(row.Type), quantity,
      ...inferPrice(row, side, quantity), event: text(row.Event), account: text(row.Account), login: text(row.Login),
      orderId: text(row["Order ID"]), sourceIndex };
  }).filter((order) => order.event.toLowerCase() === "filled" && !Number.isNaN(order.timestamp) && order.ticker && order.side && order.quantity > 0 && order.price > 0);
}

function signed(order) { return /buy/i.test(order.side) ? order.quantity : /sell|short/i.test(order.side) ? -order.quantity : 0; }
function executionFragment(order, quantity) {
  return { ...order, quantity, commission: order.executionCommission == null ? null : order.executionCommission * (quantity / order.quantity) };
}
function start(order, quantity) {
  const long = quantity > 0; const size = Math.abs(quantity);
  const fill = executionFragment(order, size);
  return { date: order.date, ticker: order.ticker, direction: long ? "Long" : "Short", entry_time: order.time, exit_time: "",
    entry_price: order.price, exit_price: 0, shares: size, pnl: long ? -order.price * size : order.price * size,
    gross_pnl: 0, fees: null, net_pnl: null, pnl_source: "gross_only", risk: 0, setup: "Unclassified", notes: "", grade: "",
    mistakeTags: [], emotionTags: [], rulesFollowed: null, screenshot: "", orders: [fill],
    entryFills: [fill], exitFills: [],
    openQuantity: quantity, entryValue: order.price * size, exitValue: 0, exitShares: 0 };
}
function finish(trade) {
  trade.entry_price = trade.entryFills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0) / trade.entryFills.reduce((sum, fill) => sum + fill.quantity, 0);
  trade.exit_price = trade.exitFills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0) / trade.exitFills.reduce((sum, fill) => sum + fill.quantity, 0);
  trade.gross_pnl = Number(trade.pnl.toFixed(2));
  trade.fees = Number(trade.orders.reduce((sum, fill) => sum + Number(fill.commission || 0), 0).toFixed(2));
  trade.net_pnl = Number((trade.gross_pnl - trade.fees).toFixed(2)); trade.pnl = trade.net_pnl; trade.pnl_source = "calculated_net";
  delete trade.openQuantity; delete trade.entryValue; delete trade.exitValue; delete trade.exitShares; return trade;
}

function orderTimestampBucket(fills, position) {
  // The export has second-level timestamps and can interleave same-second rows. Preserve the
  // current position by applying adds before reductions; a fill can reverse only if its own
  // quantity genuinely exceeds the position. This prevents row order from inventing churn.
  const preferredSign = position < 0 ? -1 : 1;
  return [...fills].sort((a, b) => {
    const signDifference = (Math.sign(signed(a)) === preferredSign ? 0 : 1) - (Math.sign(signed(b)) === preferredSign ? 0 : 1);
    return signDifference || a.sourceIndex - b.sourceIndex;
  });
}

export function reconstructExecutionStream(orders = []) {
  const active = new Map(); const trades = []; const diagnostics = {};
  const byTicker = new Map();
  orders.forEach((order) => { if (!byTicker.has(order.ticker)) byTicker.set(order.ticker, []); byTicker.get(order.ticker).push(order); });
  byTicker.forEach((tickerOrders, ticker) => {
    diagnostics[ticker] = [];
    const buckets = new Map();
    tickerOrders.forEach((order) => { if (!buckets.has(order.timestamp)) buckets.set(order.timestamp, []); buckets.get(order.timestamp).push(order); });
    [...buckets.entries()].sort(([a], [b]) => a - b).forEach(([, bucket]) => orderTimestampBucket(bucket, active.get(ticker)?.openQuantity || 0).forEach((order) => {
    const beforePosition = active.get(ticker)?.openQuantity || 0;
    let quantity = signed(order);
    let tradeAction = "";
    while (Math.abs(quantity) > EPSILON) {
      const trade = active.get(order.ticker);
      if (!trade) { active.set(order.ticker, start(order, quantity)); tradeAction = quantity > 0 ? "OPEN_LONG" : "OPEN_SHORT"; break; }
      if (Math.sign(trade.openQuantity) === Math.sign(quantity)) {
        const size = Math.abs(quantity); const fill = executionFragment(order, size); trade.orders.push(fill); trade.openQuantity += Math.sign(quantity) * size;
        trade.entryFills.push(fill); trade.shares += size; trade.entryValue += order.price * size; trade.entry_price = trade.entryValue / trade.shares;
        trade.pnl += trade.direction === "Long" ? -order.price * size : order.price * size; break;
      }
      const size = Math.min(Math.abs(trade.openQuantity), Math.abs(quantity)); const fill = executionFragment(order, size); trade.orders.push(fill);
      trade.exitFills.push(fill);
      trade.openQuantity += (trade.direction === "Long" ? -1 : 1) * size; trade.exitValue += order.price * size;
      trade.exitShares += size; trade.exit_time = order.time; trade.pnl += trade.direction === "Long" ? order.price * size : -order.price * size;
      quantity += quantity > 0 ? -size : size;
      if (Math.abs(trade.openQuantity) < EPSILON) { trades.push(finish(trade)); active.delete(order.ticker); tradeAction = Math.abs(quantity) > EPSILON ? "REVERSE" : `CLOSE_${trade.direction.toUpperCase()}`; }
      else tradeAction = `REDUCE_${trade.direction.toUpperCase()}`;
    }
    const afterPosition = active.get(ticker)?.openQuantity || 0;
    if (!tradeAction) tradeAction = beforePosition >= 0 ? "ADD_LONG" : "ADD_SHORT";
    else if (Math.sign(beforePosition) === Math.sign(afterPosition) && Math.abs(afterPosition) > Math.abs(beforePosition)) tradeAction = afterPosition > 0 ? "ADD_LONG" : "ADD_SHORT";
    diagnostics[ticker].push({ timestamp: order.timestampUtc, side: order.side, qty: order.quantity, beforePosition, afterPosition, tradeAction });
    }));
  });
  const openPositions = [...active.values()].map((trade) => ({ ticker: trade.ticker, direction: trade.direction,
    quantity: Math.abs(trade.openQuantity), entry_price: trade.entryValue / trade.shares,
    fees: Number(trade.orders.reduce((sum, fill) => sum + Number(fill.commission || 0), 0).toFixed(2)) }));
  trades.sort((a, b) => a.orders[0].timestamp - b.orders[0].timestamp);
  return { trades, openPositions, diagnostics };
}

export const groupOrdersIntoTrades = (orders = []) => reconstructExecutionStream(orders).trades;

export function selectCanonicalExecutionAccount(orders = [], manualAccount = null) {
  const grouped = new Map();
  orders.forEach((order) => { const key = `${order.login}\0${order.account}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(order); });
  const candidates = [...grouped.values()].map((fills) => {
    const rebuilt = reconstructExecutionStream(fills);
    const closed = rebuilt.trades.reduce((sum, trade) => sum + trade.shares, 0);
    const open = rebuilt.openPositions.reduce((sum, position) => sum + position.quantity, 0);
    // Completed sequences dominate; residual exposure, unusable sides and inferred prices are conservative penalties.
    const score = rebuilt.trades.length * 1e6 + closed * 100 - open * 10 - fills.filter((fill) => !signed(fill)).length * 1e5 - fills.filter((fill) => fill.priceInferred).length;
    return { account: fills[0]?.account || "", login: fills[0]?.login || "", fills, ...rebuilt, score };
  });
  if (manualAccount) return { selected: candidates.find((candidate) => candidate.account === manualAccount) || null, candidates, ambiguous: false };
  candidates.sort((a, b) => b.score - a.score);
  const ambiguous = candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < EPSILON;
  return { selected: ambiguous ? null : candidates[0] || null, candidates, ambiguous };
}

export function parseBrokerImport(rows = [], options = {}) {
  const normalizedFills = normalizeBrokerOrders(rows);
  const { executions: fills, duplicates } = deduplicateFilledExecutions(normalizedFills);
  const preferredAccount = text(options.preferredAccount);
  const detectedAccounts = [...new Set(fills.map((fill) => fill.account))];
  if (preferredAccount && !detectedAccounts.includes(preferredAccount)) {
    return { trades: [], diagnostics: { filledRows: fills.length, duplicateFilledRows: duplicates.length, accounts: detectedAccounts, accountCount: detectedAccounts.length,
      preferredAccount, preferredAccountMissing: true, ambiguous: false, status: "Preferred Account Missing",
      error: `Your preferred Trade The Pool account ${preferredAccount} was not found in this CSV.` } };
  }
  const resolvedAccount = preferredAccount || text(options.account);
  const selection = selectCanonicalExecutionAccount(fills, resolvedAccount || null);
  const accounts = selection.candidates.map((candidate) => candidate.account);
  if (!selection.selected) return { trades: [], diagnostics: { filledRows: fills.length, duplicateFilledRows: duplicates.length, accounts, accountCount: accounts.length, ambiguous: true, status: "Ambiguous Account" } };
  const selected = selection.selected; const grossPnl = Number(selected.trades.reduce((sum, trade) => sum + trade.gross_pnl, 0).toFixed(2));
  const totalFees = Number(selected.trades.reduce((sum, trade) => sum + trade.fees, 0).toFixed(2));
  const netPnl = Number((grossPnl - totalFees).toFixed(2));
  const incompleteFees = Number(selected.openPositions.reduce((sum, position) => sum + position.fees, 0).toFixed(2));
  return { trades: selected.trades, diagnostics: { filledRows: fills.length, duplicateFilledRows: duplicates.length, accounts, accountCount: accounts.length, canonicalAccount: selected.account,
    selectionMethod: preferredAccount ? "Preferred Account" : options.account ? "Manual Account" : "Automatic",
    completedTrades: selected.trades.length, openPositions: selected.openPositions, incompletePositions: selected.openPositions.length,
    reconstructionDiagnostics: selected.diagnostics,
    inferredPrices: selected.fills.filter((fill) => fill.priceInferred).length, grossPnl, totalFees, netPnl, incompleteFees,
    feesAvailable: true, feeSource: "Trade The Pool calculated commission", pnlBasis: "Net", status: "Reconciled", ambiguous: false } };
}

function journalTrades(rows) {
  return rows.map((row) => ({ date: text(row.date || row.Date), ticker: text(row.ticker || row.Ticker), direction: text(row.direction || row.Direction),
    entry_time: text(row.entry_time || row["Entry Time"]), exit_time: text(row.exit_time || row["Exit Time"]), entry_price: number(row.entry_price || row["Entry Price"]),
    exit_price: number(row.exit_price || row["Exit Price"]), shares: number(row.shares || row.Shares), pnl: number(row.pnl || row.PnL), risk: number(row.risk || row.Risk),
    setup: text(row.setup || row.Setup || "Unclassified") || "Unclassified" })).filter((trade) => trade.date && trade.ticker && trade.entry_price > 0 && trade.shares > 0);
}

export function parseTradesFromRows(rows = [], options = {}) {
  const nonEmpty = rows.filter((row) => Object.values(row || {}).some((value) => text(value)));
  if (!nonEmpty.length) return [];
  if (nonEmpty[0]["Date/Time"] || nonEmpty[0].Symbol || nonEmpty[0].Event) {
    const result = parseBrokerImport(nonEmpty, options); Object.defineProperty(result.trades, "diagnostics", { value: result.diagnostics }); return result.trades;
  }
  return journalTrades(nonEmpty);
}
