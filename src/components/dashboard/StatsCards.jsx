function StatsCards({
  stats,
  averageHoldTime,
  bestTimeOfDay,
  worstTimeOfDay,
  profitFactor,
}) {
  if (!stats || stats.totalTrades === 0) {
    return <p>No stats yet</p>;
  }

  const cards = [
    { label: "Total Trades", value: stats.totalTrades },
    { label: "Wins", value: stats.wins },
    { label: "Losses", value: stats.losses },
    { label: "Win Rate", value: `${stats.winRate}%` },
    { label: "Total PnL", value: `$${stats.totalPnl}` },
    { label: "Average R:R", value: stats.payoffRatio  },
    { label: "Average Winner", value: `$${stats.averageWinner}` },
    { label: "Average Loser", value: `$${stats.averageLoser}` },
    { label: "Best Stock", value: stats.bestStock },
    { label: "Worst Stock", value: stats.worstStock },
    { label: "Longest Win Streak", value: stats.longestWinningStreak },
    { label: "Longest Loss Streak", value: stats.longestLosingStreak },
    { label: "Average Hold Time", value: `${averageHoldTime} min` },
    { label: "Best Time", value: bestTimeOfDay },
    { label: "Worst Time", value: worstTimeOfDay },
    { label: "Profit Factor", value: profitFactor },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className="stat-card"
        >
          <h4>{card.label}</h4>
          <p>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;