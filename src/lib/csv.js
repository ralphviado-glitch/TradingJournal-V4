function convertToNewYorkTime(dateTimeString) {
  if (!dateTimeString) {
    return { date: "", time: "" };
  }

  const localDate = new Date(dateTimeString);

  if (Number.isNaN(localDate.getTime())) {
    return { date: "", time: "" };
  }

  const nyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const parts = nyFormatter.formatToParts(localDate);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")} ${get("dayPeriod")}`.trim(),
  };
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(
    String(value)
      .replace(/,/g, "")
      .replace("USD", "")
      .replace("$", "")
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
      const { date, time } = convertToNewYorkTime(dateTime);
      const price = cleanNumber(row.Price) || cleanNumber(row["Stop price"]);

      return {
        date,
        time,
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
        order.ticker &&
        order.side &&
        order.quantity > 0 &&
        order.price > 0
      );
    });
}

export function groupOrdersIntoTrades(orders = []) {
  const sortedOrders = [...orders].sort((a, b) => {
    return new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`);
  });

  const activeTrades = new Map();
  const trades = [];

  sortedOrders.forEach((order) => {
    const key = order.ticker;
    const existingTrade = activeTrades.get(key);
    const isBuy = order.side.toLowerCase() === "buy";
    const isSell = order.side.toLowerCase() === "sell";

    if (!existingTrade) {
      activeTrades.set(key, {
        date: order.date,
        ticker: order.ticker,
        direction: isBuy ? "Long" : "Short",
        entry_time: order.time,
        exit_time: "",
        entry_price: order.price,
        exit_price: 0,
        shares: order.quantity,
        pnl: isBuy
          ? -order.price * order.quantity
          : order.price * order.quantity,
        setup: "Unclassified",
        notes: "",
        grade: "",
        mistakeTags: [],
        emotionTags: [],
        rulesFollowed: false,
        screenshot: "",
        risk: 0,
        orders: [order],
        openQuantity: isBuy ? order.quantity : -order.quantity,
        entryValue: order.price * order.quantity,
        exitValue: 0,
        exitShares: 0,
      });

      return;
    }

    existingTrade.orders.push(order);

    if (isBuy) {
      existingTrade.pnl -= order.price * order.quantity;
    }

    if (isSell) {
      existingTrade.pnl += order.price * order.quantity;
    }

    if (existingTrade.direction === "Long") {
      if (isBuy) {
        existingTrade.openQuantity += order.quantity;
        existingTrade.shares += order.quantity;
        existingTrade.entryValue += order.price * order.quantity;
        existingTrade.entry_price = Number(
          (existingTrade.entryValue / existingTrade.shares).toFixed(2)
        );
      }

      if (isSell) {
        existingTrade.openQuantity -= order.quantity;
        existingTrade.exitValue += order.price * order.quantity;
        existingTrade.exitShares += order.quantity;
        existingTrade.exit_time = order.time;
      }
    }

    if (existingTrade.direction === "Short") {
      if (isSell) {
        existingTrade.openQuantity -= order.quantity;
        existingTrade.shares += order.quantity;
        existingTrade.entryValue += order.price * order.quantity;
        existingTrade.entry_price = Number(
          (existingTrade.entryValue / existingTrade.shares).toFixed(2)
        );
      }

      if (isBuy) {
        existingTrade.openQuantity += order.quantity;
        existingTrade.exitValue += order.price * order.quantity;
        existingTrade.exitShares += order.quantity;
        existingTrade.exit_time = order.time;
      }
    }

    if (existingTrade.openQuantity === 0) {
      existingTrade.exit_price =
        existingTrade.exitShares === 0
          ? 0
          : Number((existingTrade.exitValue / existingTrade.exitShares).toFixed(2));

      existingTrade.pnl = Number(existingTrade.pnl.toFixed(2));

      delete existingTrade.openQuantity;
      delete existingTrade.entryValue;
      delete existingTrade.exitValue;
      delete existingTrade.exitShares;

      trades.push(existingTrade);
      activeTrades.delete(key);
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
