import { tradeThePoolTimestampToNewYork } from "./marketTime";

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(
    String(value)
      .replace(/,/g, "")
      .replace("USD", "")
      .replace("$", "")
      .replace(/[()]/g, "")
      .trim()
  );
}

function cleanText(value) {
  return String(value || "").trim();
}

function isBrokerOrderRow(row = {}) {
  return Boolean(row["Date/Time"] || row["Symbol"] || row["Event"]);
}

function isJournalTradeRow(row = {}) {
  return Boolean(
    row.date ||
      row.Date ||
      row.ticker ||
      row.Ticker ||
      row.entry_price ||
      row["Entry Price"]
  );
}

function normalizeJournalTrades(rows = []) {
  return rows
    .map((row) => ({
      date: cleanText(row.date || row.Date),
      ticker: cleanText(row.ticker || row.Ticker),
      direction: cleanText(row.direction || row.Direction),
      entry_time: cleanText(row.entry_time || row["Entry Time"]),
      exit_time: cleanText(row.exit_time || row["Exit Time"]),
      entry_price: cleanNumber(row.entry_price || row["Entry Price"]),
      exit_price: cleanNumber(row.exit_price || row["Exit Price"]),
      shares: cleanNumber(row.shares || row.Shares),
      pnl: cleanNumber(row.pnl || row.PnL),
      risk: cleanNumber(row.risk || row.Risk),
      setup: cleanText(row.setup || row.Setup || "Unclassified") || "Unclassified",
    }))
    .filter((trade) => {
      return (
        trade.date &&
        trade.ticker &&
        trade.entry_price > 0 &&
        trade.shares > 0
      );
    });
}

export function normalizeBrokerOrders(rows = []) {
  return rows
    .map((row) => {
      const dateTime = cleanText(row["Date/Time"]);
      const normalizedTimestamp = tradeThePoolTimestampToNewYork(dateTime);
      const price = cleanNumber(row.Price) || cleanNumber(row["Stop price"]);

      return {
        date: normalizedTimestamp?.date || "",
        time: normalizedTimestamp?.time || "",
        timestamp: normalizedTimestamp?.timestamp ?? Number.NaN,
        timestampUtc: normalizedTimestamp?.timestampUtc || "",
        ticker: cleanText(row.Symbol),
        side: cleanText(row.Side),
        type: cleanText(row.Type),
        quantity: cleanNumber(row.Quantity),
        price,
        event: cleanText(row.Event),
      };
    })
    .filter((order) => {
      return (
        order.event.toLowerCase() === "filled" &&
        !Number.isNaN(order.timestamp) &&
        order.ticker &&
        order.side &&
        order.quantity > 0 &&
        order.price > 0
      );
    });
}

function getOrderSignedQuantity(order) {
  const side = order.side.toLowerCase();

  if (side.includes("buy")) {
    return order.quantity;
  }

  if (side.includes("sell") || side.includes("short")) {
    return -order.quantity;
  }

  return 0;
}

function createActiveTrade(order, signedQuantity) {
  const isLong = signedQuantity > 0;
  const quantity = Math.abs(signedQuantity);

  return {
    date: order.date,
    ticker: order.ticker,
    direction: isLong ? "Long" : "Short",
    entry_time: order.time,
    exit_time: "",
    entry_price: order.price,
    exit_price: 0,
    shares: quantity,
    pnl: isLong ? -order.price * quantity : order.price * quantity,
    setup: "Unclassified",
    notes: "",
    grade: "",
    mistakeTags: [],
    emotionTags: [],
    rulesFollowed: null,
    screenshot: "",
    risk: 0,
    orders: [{ ...order, quantity }],
    openQuantity: signedQuantity,
    entryValue: order.price * quantity,
    exitValue: 0,
    exitShares: 0,
  };
}

function addToTradeEntry(trade, order, quantity) {
  const entryDirection = trade.direction === "Long" ? 1 : -1;

  trade.orders.push({ ...order, quantity });
  trade.openQuantity += entryDirection * quantity;
  trade.shares += quantity;
  trade.entryValue += order.price * quantity;
  trade.entry_price = Number((trade.entryValue / trade.shares).toFixed(2));
  trade.pnl += trade.direction === "Long" ? -order.price * quantity : order.price * quantity;
}

function closeTradeQuantity(trade, order, quantity) {
  const closeDirection = trade.direction === "Long" ? -1 : 1;

  trade.orders.push({ ...order, quantity });
  trade.openQuantity += closeDirection * quantity;
  trade.exitValue += order.price * quantity;
  trade.exitShares += quantity;
  trade.exit_time = order.time;
  trade.pnl += trade.direction === "Long" ? order.price * quantity : -order.price * quantity;
}

function finalizeTrade(trade) {
  trade.exit_price =
    trade.exitShares === 0
      ? 0
      : Number((trade.exitValue / trade.exitShares).toFixed(2));

  trade.pnl = Number(trade.pnl.toFixed(2));

  delete trade.openQuantity;
  delete trade.entryValue;
  delete trade.exitValue;
  delete trade.exitShares;

  return trade;
}

export function groupOrdersIntoTrades(orders = []) {
  const sortedOrders = [...orders].sort((a, b) => {
    return a.timestamp - b.timestamp;
  });

  const activeTrades = new Map();
  const trades = [];

  sortedOrders.forEach((order) => {
    const key = order.ticker;
    let signedQuantity = getOrderSignedQuantity(order);

    while (signedQuantity !== 0) {
      const existingTrade = activeTrades.get(key);

      if (!existingTrade) {
        activeTrades.set(key, createActiveTrade(order, signedQuantity));
        signedQuantity = 0;
        continue;
      }

      const sameDirection = Math.sign(existingTrade.openQuantity) === Math.sign(signedQuantity);

      if (sameDirection) {
        addToTradeEntry(existingTrade, order, Math.abs(signedQuantity));
        signedQuantity = 0;
        continue;
      }

      const closingQuantity = Math.min(
        Math.abs(existingTrade.openQuantity),
        Math.abs(signedQuantity)
      );

      closeTradeQuantity(existingTrade, order, closingQuantity);
      signedQuantity += signedQuantity > 0 ? -closingQuantity : closingQuantity;

      if (Math.abs(existingTrade.openQuantity) < 0.0000001) {
        trades.push(finalizeTrade(existingTrade));
        activeTrades.delete(key);
      }
    }
  });

  return trades;
}

export function parseTradesFromRows(rows = []) {
  const nonEmptyRows = rows.filter((row) =>
    Object.values(row || {}).some((value) => cleanText(value) !== "")
  );

  if (nonEmptyRows.length === 0) {
    return [];
  }

  if (isBrokerOrderRow(nonEmptyRows[0])) {
    return groupOrdersIntoTrades(normalizeBrokerOrders(nonEmptyRows));
  }

  if (isJournalTradeRow(nonEmptyRows[0])) {
    return normalizeJournalTrades(nonEmptyRows);
  }

  return [];
}
