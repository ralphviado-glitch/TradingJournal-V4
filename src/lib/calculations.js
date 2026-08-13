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
    const day = date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
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
    const day = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
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

export function buildMistakeAnalysis(trades = []) {
  const mistakeCounts = {};

  trades.forEach((trade) => {
    const tags = trade.mistakeTags || [];

    tags.forEach((tag) => {
      mistakeCounts[tag] = (mistakeCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(mistakeCounts)
    .map(([mistake, count]) => ({
      mistake,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function generateImprovementSuggestions(trades = []) {
  const mistakes = buildMistakeAnalysis(trades);

  if (!mistakes || mistakes.length === 0) {
    return ["No repeated mistakes found yet. Keep tagging your trades."];
  }

  const topMistake = mistakes[0];

  const suggestionMap = {
    "Late Entry": "Focus on waiting for cleaner confirmation before entering. Create a rule that you only enter after the retest confirms.",
    FOMO: "Avoid chasing extended moves. Create a checklist that blocks entries after price has already moved too far from your planned level.",
    Chasing: "Improve patience. Only take trades near planned levels instead of entering after the move has already happened.",
    Overtrading: "Set a maximum trade limit per session. Stop trading after 2 losses or after reaching your planned daily risk.",
    "No Stop": "Define your invalidation before entering. Every trade should have a clear level where the idea is wrong.",
    "Early Exit": "Review whether you are exiting because of your plan or emotion. Consider scaling instead of fully exiting too early.",
    Hesitation: "Prepare your levels before the session so execution becomes rule-based instead of emotional.",
  };

  const suggestion =
    suggestionMap[topMistake.mistake] ||
    `Your most repeated mistake is "${topMistake.mistake}". Review trades with this tag and create one rule to reduce it.`;

  return [
    `Your most repeated mistake is ${topMistake.mistake}, appearing ${topMistake.count} time(s).`,
    suggestion,
  ];
}

export function generateTradeReview(trade) {
  if (!trade) {
    return [];
  }

  const pnl = Number(trade.pnl || 0);
  const reviews = [];

  if (pnl > 0) {
    reviews.push("This was a winning trade.");
  } else if (pnl < 0) {
    reviews.push("This was a losing trade. Review whether the setup was valid and if risk was controlled.");
  } else {
    reviews.push("This trade ended breakeven.");
  }

  if (trade.grade) {
    reviews.push(`Trade quality grade: ${trade.grade}.`);
  }

  if (trade.rulesFollowed === true) {
    reviews.push("You followed your trading rules on this trade.");
  } else if (trade.rulesFollowed === false) {
    reviews.push("Rules were not marked as followed. Review whether this trade matched your plan.");
  } else {
    reviews.push("Rules followed: Unknown.");
  }

  if (trade.mistakeTags && trade.mistakeTags.length > 0) {
    reviews.push(`Mistakes tagged: ${trade.mistakeTags.join(", ")}.`);
  }

  if (trade.emotionTags && trade.emotionTags.length > 0) {
    reviews.push(`Emotions tagged: ${trade.emotionTags.join(", ")}.`);
  }

  if (trade.notes) {
    reviews.push(`Your note: ${trade.notes}`);
  }

  return reviews;
}

export function buildPerformanceByGrade(trades = []) {
  const gradeStats = {};

  trades.forEach((trade) => {
    const grade = trade.grade || "Ungraded";
    const pnl = Number(trade.pnl || 0);

    if (!gradeStats[grade]) {
      gradeStats[grade] = {
        grade,
        trades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
      };
    }

    gradeStats[grade].trades += 1;
    gradeStats[grade].totalPnl += pnl;

    if (pnl > 0) {
      gradeStats[grade].wins += 1;
    }

    if (pnl < 0) {
      gradeStats[grade].losses += 1;
    }
  });

  return Object.values(gradeStats).map((grade) => ({
    ...grade,
    winRate:
      grade.trades === 0
        ? 0
        : Number(((grade.wins / grade.trades) * 100).toFixed(1)),
    totalPnl: Number(grade.totalPnl.toFixed(2)),
  }));
}

function getLatestWeekTrades(trades = []) {
  if (!trades || trades.length === 0) {
    return [];
  }

  const validTrades = trades
    .filter((trade) => trade.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (validTrades.length === 0) {
    return [];
  }

  const latestTradeDate = new Date(validTrades[validTrades.length - 1].date);

  const startOfWeek = new Date(latestTradeDate);
  startOfWeek.setUTCDate(latestTradeDate.getUTCDate() - latestTradeDate.getUTCDay() + 1);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  return validTrades.filter((trade) => {
    const tradeDate = new Date(trade.date);
    return tradeDate >= startOfWeek && tradeDate <= endOfWeek;
  });
}

export function generateWeeklySummary(trades = []) {
  const weeklyTrades = getLatestWeekTrades(trades);

  if (!weeklyTrades || weeklyTrades.length === 0) {
    return ["No trades available for the current week."];
  }

  const stats = calculateStats(weeklyTrades);
  const profitFactor = calculateProfitFactor(weeklyTrades);
  const bestTime = getBestTimeOfDay(weeklyTrades);
  const worstTime = getWorstTimeOfDay(weeklyTrades);
  const mistakes = buildMistakeAnalysis(weeklyTrades);
  const suggestions = generateImprovementSuggestions(weeklyTrades);

  const summary = [];

  summary.push(
    `This week, you took ${stats.totalTrades} trades with a ${stats.winRate}% win rate and total PnL of $${Number(stats.totalPnl).toFixed(2)}.`
  );

  summary.push(
    `Your average winner was $${stats.averageWinner}, while your average loser was $${stats.averageLoser}.`
  );

  summary.push(`Your profit factor was ${profitFactor}.`);
  summary.push(`Your best trading session was ${bestTime}.`);
  summary.push(`Your weakest trading session was ${worstTime}.`);

  if (mistakes.length > 0) {
    summary.push(
      `Your most repeated mistake was ${mistakes[0].mistake}, appearing ${mistakes[0].count} time(s).`
    );
  }

  summary.push(...suggestions);

  return summary;
}

function getLatestMonthTrades(trades = []) {
  if (!trades || trades.length === 0) {
    return [];
  }

  const validTrades = trades
    .filter((trade) => trade.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (validTrades.length === 0) {
    return [];
  }

  const latestTradeDate = new Date(
    validTrades[validTrades.length - 1].date
  );

  const targetMonth = latestTradeDate.getUTCMonth();
  const targetYear = latestTradeDate.getUTCFullYear();

  return validTrades.filter((trade) => {
    const tradeDate = new Date(trade.date);

    return (
      tradeDate.getUTCMonth() === targetMonth &&
      tradeDate.getUTCFullYear() === targetYear
    );
  });
}

export function generateMonthlySummary(trades = []) {
  const monthlyTrades = getLatestMonthTrades(trades);

  if (!monthlyTrades || monthlyTrades.length === 0) {
    return ["No trades available for monthly summary."];
  }

  const stats = calculateStats(monthlyTrades);
  const profitFactor = calculateProfitFactor(monthlyTrades);
  const bestTime = getBestTimeOfDay(monthlyTrades);
  const worstTime = getWorstTimeOfDay(monthlyTrades);
  const mistakes = buildMistakeAnalysis(monthlyTrades);
  const suggestions =
    generateImprovementSuggestions(monthlyTrades);

  const summary = [];

  summary.push(
    `This month, you took ${stats.totalTrades} trades with a ${stats.winRate}% win rate and total PnL of $${Number(stats.totalPnl).toFixed(2)}.`
  );

  summary.push(
    `Your average winner was $${stats.averageWinner}, while your average loser was $${stats.averageLoser}.`
  );

  summary.push(`Your profit factor was ${profitFactor}.`);

  summary.push(`Your best trading session was ${bestTime}.`);
  summary.push(`Your weakest trading session was ${worstTime}.`);

  if (mistakes.length > 0) {
    summary.push(
      `Your most repeated mistake was ${mistakes[0].mistake}, appearing ${mistakes[0].count} time(s).`
    );
  }

  summary.push(...suggestions);

  return summary;
}

export function generateRulesFromWinners(trades = []) {
  const winningTrades = trades.filter((trade) => Number(trade.pnl || 0) > 0);

  if (winningTrades.length === 0) {
    return ["No winning trades found yet."];
  }

  const setupCounts = {};
  const gradeCounts = {};
  const emotionCounts = {};

  winningTrades.forEach((trade) => {
    const setup = trade.setup || "Unclassified";
    const grade = trade.grade || "Ungraded";
    const emotions = trade.emotionTags || [];

    setupCounts[setup] = (setupCounts[setup] || 0) + 1;
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

    emotions.forEach((emotion) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
  });

  const getTopItem = (counts) => {
    const entries = Object.entries(counts);

    if (entries.length === 0) {
      return null;
    }

    return entries.sort((a, b) => b[1] - a[1])[0];
  };

  const topSetup = getTopItem(setupCounts);
  const topGrade = getTopItem(gradeCounts);
  const topEmotion = getTopItem(emotionCounts);

  const rules = [];

  if (topSetup) {
    rules.push(
      `Prioritize ${topSetup[0]} setups because they appear most often in your winning trades.`
    );
  }

  if (topGrade) {
    rules.push(
      `Focus on taking trades that match your ${topGrade[0]} quality standard.`
    );
  }

  if (topEmotion) {
    rules.push(
      `Notice your emotional state: ${topEmotion[0]} appears often in winning trades.`
    );
  }

  rules.push(
    "Before entering, confirm the setup, market context, and risk are aligned."
  );

  return rules;
}

export function generateAvoidListFromLosers(trades = []) {
  const losingTrades = trades.filter((trade) => Number(trade.pnl || 0) < 0);

  if (losingTrades.length === 0) {
    return ["No losing trades found. Keep protecting your downside."];
  }

  const setupCounts = {};
  const gradeCounts = {};
  const mistakeCounts = {};
  const emotionCounts = {};

  losingTrades.forEach((trade) => {
    const setup = trade.setup || "Unclassified";
    const grade = trade.grade || "Ungraded";
    const mistakes = trade.mistakeTags || [];
    const emotions = trade.emotionTags || [];

    setupCounts[setup] = (setupCounts[setup] || 0) + 1;
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

    mistakes.forEach((mistake) => {
      mistakeCounts[mistake] = (mistakeCounts[mistake] || 0) + 1;
    });

    emotions.forEach((emotion) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
  });

  const getTopItem = (counts) => {
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;

    return entries.sort((a, b) => b[1] - a[1])[0];
  };

  const topSetup = getTopItem(setupCounts);
  const topGrade = getTopItem(gradeCounts);
  const topMistake = getTopItem(mistakeCounts);
  const topEmotion = getTopItem(emotionCounts);

  const avoidList = [];

  if (topSetup) {
    avoidList.push(
      `Avoid forcing ${topSetup[0]} setups when conditions are not clean. This setup appears often in losing trades.`
    );
  }

  if (topGrade) {
    avoidList.push(
      `Be cautious with ${topGrade[0]} quality trades. This grade appears often in losing trades.`
    );
  }

  if (topMistake) {
    avoidList.push(
      `Avoid trades involving ${topMistake[0]}. This is your most common losing-trade mistake.`
    );
  }

  if (topEmotion) {
    avoidList.push(
      `Be careful when trading while feeling ${topEmotion[0]}. This emotion appears often in losing trades.`
    );
  }

  avoidList.push(
    "Do not take trades that fail your setup checklist, risk rules, or market context."
  );

  return avoidList;
}

export function generateNextWeekFocus(trades = []) {
  const winnerRules = generateRulesFromWinners(trades);
  const avoidList = generateAvoidListFromLosers(trades);
  const suggestions = generateImprovementSuggestions(trades);

  const focus = [];

  focus.push("Primary Focus:");

  if (suggestions.length > 0) {
    focus.push(suggestions[0]);
  }

  focus.push("");

  focus.push("Continue Doing:");

  winnerRules.slice(0, 2).forEach((rule) => {
    focus.push(rule);
  });

  focus.push("");

  focus.push("Avoid:");

  avoidList.slice(0, 2).forEach((item) => {
    focus.push(item);
  });

  focus.push("");

  focus.push(
    "Goal: Execute only high-quality trades that match your proven edge."
  );

  return focus;
}

export function getTradeMarketAlignment(trade, marketDay) {
  if (!trade || !marketDay) {
    return "Unknown";
  }

  const direction = trade.direction;
  const qqqBias = marketDay.qqq_bias;
  const spyBias = marketDay.spy_bias;

  const isLong = direction === "Long";
  const isShort = direction === "Short";

  const qqqAligned =
    (isLong && qqqBias === "Bullish") ||
    (isShort && qqqBias === "Bearish");

  const spyAligned =
    (isLong && spyBias === "Bullish") ||
    (isShort && spyBias === "Bearish");

  if (qqqAligned && spyAligned) {
    return "Fully Aligned";
  }

  if (qqqAligned || spyAligned) {
    return "Partially Aligned";
  }

  return "Against Market";
}

export function getMarketDayForTrade(trade, marketDays) {
  if (!trade || !marketDays?.length) {
    return null;
  }

  const tradeDate = trade.trade_date || trade.date;

  return marketDays.find(
    (day) => day.trade_date === tradeDate
  );
}

export function getPerformanceByMarketCondition(
  trades,
  marketDays
) {
  const stats = {};

  trades.forEach((trade) => {
    const tradeDate = trade.trade_date || trade.date;
    const marketDay = marketDays.find(
      (day) => day.trade_date === tradeDate
    );

    if (!marketDay) {
      return;
    }

    const condition = marketDay.market_condition || "Unknown";

    if (!stats[condition]) {
      stats[condition] = {
        condition,
        trades: 0,
        wins: 0,
        pnl: 0,
      };
    }

    const pnl = Number(trade.pnl || 0);

    stats[condition].trades += 1;
    stats[condition].pnl += pnl;

    if (pnl > 0) {
      stats[condition].wins += 1;
    }
  });

  return Object.values(stats).map((item) => ({
    ...item,
    winRate:
      item.trades > 0
        ? ((item.wins / item.trades) * 100).toFixed(1)
        : 0,
  }));
}

export function getPerformanceByEventType(trades, marketDays) {
  const stats = {};

  trades.forEach((trade) => {
    const tradeDate = trade.trade_date || trade.date;
    const marketDay = marketDays.find(
      (day) => day.trade_date === tradeDate
    );

    if (!marketDay) {
      return;
    }

    const eventType = marketDay.event_type || "None";

    if (!stats[eventType]) {
      stats[eventType] = {
        eventType,
        trades: 0,
        wins: 0,
        pnl: 0,
      };
    }

    const pnl = Number(trade.pnl || 0);

    stats[eventType].trades += 1;
    stats[eventType].pnl += pnl;

    if (pnl > 0) {
      stats[eventType].wins += 1;
    }
  });

  return Object.values(stats).map((item) => ({
    ...item,
    winRate:
      item.trades > 0
        ? ((item.wins / item.trades) * 100).toFixed(1)
        : 0,
  }));
}
