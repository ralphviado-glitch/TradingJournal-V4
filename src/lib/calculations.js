export function calculateStats(trades = []) {
  const totalTrades = trades.length;

  const winsArray = trades.filter((trade) => Number(trade.pnl) > 0);
  const lossesArray = trades.filter((trade) => Number(trade.pnl) < 0);

  const wins = winsArray.length;
  const losses = lossesArray.length;

  const totalPnl = trades.reduce((sum, trade) => {
    return sum + Number(trade.pnl || 0);
  }, 0);

  const winRate =
    totalTrades === 0 ? 0 : Number(((wins / totalTrades) * 100).toFixed(1));

  const averageWinner =
    wins === 0
      ? 0
      : Number(
          (
            winsArray.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0) /
            wins
          ).toFixed(2)
        );

  const averageLoser =
    losses === 0
      ? 0
      : Number(
          (
            lossesArray.reduce(
              (sum, trade) => sum + Number(trade.pnl || 0),
              0
            ) / losses
          ).toFixed(2)
        );

    const payoffRatio =
      averageLoser === 0
        ? "N/A"
        : Number((averageWinner / Math.abs(averageLoser)).toFixed(2));

      const pnlByStock = trades.reduce((acc, trade) => {
        const ticker = trade.ticker || "Unknown";
        const pnl = Number(trade.pnl || 0);

        acc[ticker] = (acc[ticker] || 0) + pnl;

        return acc;
      }, {});

  const stockEntries = Object.entries(pnlByStock);

  const bestStock =
    stockEntries.length === 0
      ? "N/A"
      : stockEntries.reduce((best, current) =>
          current[1] > best[1] ? current : best
        )[0];

  const worstStock =
    stockEntries.length === 0
      ? "N/A"
      : stockEntries.reduce((worst, current) =>
          current[1] < worst[1] ? current : worst
        )[0];

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinningStreak = 0;
  let longestLosingStreak = 0;

  trades.forEach((trade) => {
    const pnl = Number(trade.pnl || 0);

    if (pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      longestWinningStreak = Math.max(longestWinningStreak, currentWinStreak);
    } else if (pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      longestLosingStreak = Math.max(longestLosingStreak, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnl,
    payoffRatio,
    averageWinner,
    averageLoser,
    bestStock,
    worstStock,
    longestWinningStreak,
    longestLosingStreak,
  };
}

export function buildEquityCurve(trades = []) {
  let runningPnl = 0;

  return trades.map((trade, index) => {
    runningPnl += Number(trade.pnl || 0);

    return {
      tradeNumber: index + 1,
      date: trade.date,
      equity: runningPnl,
    };
  });
}

export function buildDrawdown(trades = []) {
  let runningPnl = 0;
  let peak = 0;

  return trades.map((trade, index) => {
    runningPnl += Number(trade.pnl || 0);
    peak = Math.max(peak, runningPnl);

    return {
      tradeNumber: index + 1,
      date: trade.date,
      drawdown: runningPnl - peak,
    };
  });
}

export function buildPerformanceByDay(trades = []) {
  const pnlByDay = {};

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const pnl = Number(trade.pnl || 0);

    pnlByDay[day] = (pnlByDay[day] || 0) + pnl;
  });

  return Object.entries(pnlByDay).map(([day, pnl]) => ({
    day,
    pnl,
  }));
}

export function getBestPerformingSetup(trades = []) {
  const setupPerformance = {};

  trades.forEach((trade) => {
    const setup = trade.setup || "Unknown";
    const pnl = Number(trade.pnl || 0);

    setupPerformance[setup] = (setupPerformance[setup] || 0) + pnl;
  });

  const entries = Object.entries(setupPerformance);

  if (entries.length === 0) {
    return "N/A";
  }

  const bestSetup = entries.reduce((best, current) =>
    current[1] > best[1] ? current : best
  );

  return `${bestSetup[0]} ($${bestSetup[1]})`;
}

export function getWorstPerformingSetup(trades = []) {
  const setupPerformance = {};

  trades.forEach((trade) => {
    const setup = trade.setup || "Unknown";
    const pnl = Number(trade.pnl || 0);

    setupPerformance[setup] = (setupPerformance[setup] || 0) + pnl;
  });

  const entries = Object.entries(setupPerformance);

  if (entries.length === 0) {
    return "N/A";
  }

  const worstSetup = entries.reduce((worst, current) =>
    current[1] < worst[1] ? current : worst
  );

  return `${worstSetup[0]} ($${worstSetup[1]})`;
}

export function getBestTradingDay(trades = []) {
  const dayPerformance = {};

  trades.forEach((trade) => {
    const date = new Date(trade.date);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    const pnl = Number(trade.pnl || 0);

    dayPerformance[day] = (dayPerformance[day] || 0) + pnl;
  });

  const entries = Object.entries(dayPerformance);

  if (entries.length === 0) {
    return "N/A";
  }

  const bestDay = entries.reduce((best, current) =>
    current[1] > best[1] ? current : best
  );

  return `${bestDay[0]} ($${bestDay[1]})`;
}

export function getBestTimeOfDay(trades = []) {
  const performanceByTime = buildPerformanceByTimeOfDay(trades);

  if (!performanceByTime || performanceByTime.length === 0) {
    return "N/A";
  }

  const bestSession = [...performanceByTime].sort(
    (a, b) => b.totalPnl - a.totalPnl
  )[0];

  return `${bestSession.session} ($${bestSession.totalPnl})`;
}

export function generatePlainEnglishInsights(trades = []) {
    if (!trades || trades.length === 0) {
      return ["Upload trades to generate insights."];
    }

    const stats = calculateStats(trades);
    const setupStats = buildStatsBySetup(trades);
    const tickerStats = buildStatsByTicker(trades);

    const insights = [];

    insights.push(
      `You took ${stats.totalTrades} trades with a ${stats.winRate}% win rate and total PnL of $${stats.totalPnl}.`
    );

    if (stats.payoffRatio !== "N/A") {
      insights.push(
        `Your realized RRR is ${stats.payoffRatio}. This means your average winner is ${stats.payoffRatio}x your average loser.`
      );
    }

    if (stats.averageWinner > Math.abs(stats.averageLoser)) {
      insights.push("Your average winner is larger than your average loser. This is a strong sign.");
    } else {
      insights.push("Your average loser is larger than your average winner. Focus on cutting losses faster.");
    }

    const bestSetup = [...setupStats].sort((a, b) => b.totalPnl - a.totalPnl)[0];
    const worstSetup = [...setupStats].sort((a, b) => a.totalPnl - b.totalPnl)[0];

    if (bestSetup) {
      insights.push(
        `Your best setup is ${bestSetup.setup} with $${bestSetup.totalPnl} total PnL and a ${bestSetup.winRate}% win rate.`
      );
    }

    if (worstSetup && worstSetup.setup !== bestSetup?.setup) {
      insights.push(
        `Your weakest setup is ${worstSetup.setup} with $${worstSetup.totalPnl} total PnL and a ${worstSetup.winRate}% win rate.`
      );
    }

    const bestTicker = [...tickerStats].sort((a, b) => b.totalPnl - a.totalPnl)[0];
    const worstTicker = [...tickerStats].sort((a, b) => a.totalPnl - b.totalPnl)[0];

    if (bestTicker) {
      insights.push(
        `${bestTicker.ticker} is your strongest ticker with $${bestTicker.totalPnl} total PnL.`
      );
    }

    if (worstTicker && worstTicker.ticker !== bestTicker?.ticker) {
      insights.push(
        `${worstTicker.ticker} is your weakest ticker with $${worstTicker.totalPnl} total PnL.`
      );
    }

    if (stats.longestLosingStreak >= 3) {
      insights.push(
        `You had a ${stats.longestLosingStreak}-trade losing streak. Consider adding a daily stop or pause rule after repeated losses.`
      );
    }

    if (stats.totalTrades >= 10 && stats.winRate < 40) {
      insights.push(
        "Your win rate is below 40%. Review whether your entries are too late or your setup criteria are too loose."
      );
    }

    return insights;
}

export function buildStatsBySetup(trades = []) {
  const setupMap = {};

  trades.forEach((trade) => {
    const setup = trade.setup || "Unclassified";
    const pnl = Number(trade.pnl || 0);

    if (!setupMap[setup]) {
      setupMap[setup] = {
        setup,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
      };
    }

    setupMap[setup].totalTrades += 1;
    setupMap[setup].totalPnl += pnl;

    if (pnl > 0) {
      setupMap[setup].wins += 1;
    }

    if (pnl < 0) {
      setupMap[setup].losses += 1;
    }
  });

  return Object.values(setupMap).map((item) => ({
    ...item,
    winRate:
      item.totalTrades === 0
        ? 0
        : Number(((item.wins / item.totalTrades) * 100).toFixed(1)),
    totalPnl: Number(item.totalPnl.toFixed(2)),
  }));
}

export function buildStatsByTicker(trades = []) {
  const tickerMap = {};

  trades.forEach((trade) => {
    const ticker = trade.ticker || "Unknown";
    const pnl = Number(trade.pnl || 0);

    if (!tickerMap[ticker]) {
      tickerMap[ticker] = {
        ticker,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
      };
    }

    tickerMap[ticker].totalTrades += 1;
    tickerMap[ticker].totalPnl += pnl;

    if (pnl > 0) {
      tickerMap[ticker].wins += 1;
    }

    if (pnl < 0) {
      tickerMap[ticker].losses += 1;
    }
  });

  return Object.values(tickerMap).map((item) => ({
    ...item,
    winRate:
      item.totalTrades === 0
        ? 0
        : Number(((item.wins / item.totalTrades) * 100).toFixed(1)),
    totalPnl: Number(item.totalPnl.toFixed(2)),
  }));
}

export function calculateAverageHoldTime(trades = []) {
  const tradesWithDuration = trades
    .map((trade) => {
      if (!trade.date || !trade.entry_time || !trade.exit_time) {
        return null;
      }

      const entryDateTime = new Date(`${trade.date} ${trade.entry_time}`);
      const exitDateTime = new Date(`${trade.date} ${trade.exit_time}`);

      const durationMinutes = (exitDateTime - entryDateTime) / 1000 / 60;

      if (Number.isNaN(durationMinutes) || durationMinutes < 0) {
        return null;
      }

      return durationMinutes;
    })
    .filter((duration) => duration !== null);

  if (tradesWithDuration.length === 0) {
    return "N/A";
  }

  const totalMinutes = tradesWithDuration.reduce((sum, duration) => {
    return sum + duration;
  }, 0);

  const averageMinutes = totalMinutes / tradesWithDuration.length;

  return Number(averageMinutes.toFixed(1));
}

function getMinutesFromTime(timeString) {
  if (!timeString) return null;

  const date = new Date(`2000-01-01 ${timeString}`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
}

function getTradingSession(timeString) {
  const minutes = getMinutesFromTime(timeString);

  if (minutes === null) {
    return "Unknown";
  }

  const openStart = 9 * 60 + 30; // 9:30 AM
  const openEnd = 10 * 60 + 30; // 10:30 AM
  const middayEnd = 14 * 60; // 2:00 PM
  const closeEnd = 16 * 60; // 4:00 PM

  if (minutes >= openStart && minutes < openEnd) {
    return "Open";
  }

  if (minutes >= openEnd && minutes < middayEnd) {
    return "Midday";
  }

  if (minutes >= middayEnd && minutes <= closeEnd) {
    return "Power Hour";
  }

  return "Outside RTH";
}

export function buildPerformanceByTimeOfDay(trades = []) {
  const sessionMap = {
    Open: { session: "Open", totalPnl: 0, trades: 0 },
    Midday: { session: "Midday", totalPnl: 0, trades: 0 },
    "Power Hour": { session: "Power Hour", totalPnl: 0, trades: 0 },
    "Outside RTH": { session: "Outside RTH", totalPnl: 0, trades: 0 },
    Unknown: { session: "Unknown", totalPnl: 0, trades: 0 },
  };

  trades.forEach((trade) => {
    const session = getTradingSession(trade.entry_time);
    const pnl = Number(trade.pnl || 0);

    sessionMap[session].totalPnl += pnl;
    sessionMap[session].trades += 1;
  });

  return Object.values(sessionMap)
    .filter((session) => session.trades > 0)
    .map((session) => ({
      ...session,
      totalPnl: Number(session.totalPnl.toFixed(2)),
    }));
}

export function getWorstTimeOfDay(trades = []) {
  const performanceByTime = buildPerformanceByTimeOfDay(trades);

  if (!performanceByTime || performanceByTime.length === 0) {
    return "N/A";
  }

  const worstSession = [...performanceByTime].sort(
    (a, b) => a.totalPnl - b.totalPnl
  )[0];

  return `${worstSession.session} ($${worstSession.totalPnl})`;
}

export function calculateProfitFactor(trades = []) {
  const grossProfit = trades
    .filter((trade) => Number(trade.pnl) > 0)
    .reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);

  const grossLoss = trades
    .filter((trade) => Number(trade.pnl) < 0)
    .reduce((sum, trade) => sum + Math.abs(Number(trade.pnl || 0)), 0);

  if (grossLoss === 0) {
    return "N/A";
  }

  return Number((grossProfit / grossLoss).toFixed(2));
}

export function buildLongVsShortPerformance(trades = []) {
  const performance = {
    Long: {
      side: "Long",
      trades: 0,
      totalPnl: 0,
      wins: 0,
      losses: 0,
    },
    Short: {
      side: "Short",
      trades: 0,
      totalPnl: 0,
      wins: 0,
      losses: 0,
    },
  };

  trades.forEach((trade) => {
    const pnl = Number(trade.pnl || 0);
    const direction = trade.direction || "Long";

    const side = direction.toLowerCase() === "short" ? "Short" : "Long";

    performance[side].trades += 1;
    performance[side].totalPnl += pnl;

    if (pnl > 0) {
      performance[side].wins += 1;
    }

    if (pnl < 0) {
      performance[side].losses += 1;
    }
  });

  return Object.values(performance).map((item) => ({
    ...item,
    totalPnl: Number(item.totalPnl.toFixed(2)),
    winRate:
      item.trades === 0
        ? 0
        : Number(((item.wins / item.trades) * 100).toFixed(1)),
  }));
}