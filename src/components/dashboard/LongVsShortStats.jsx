function LongVsShortStats({ data }) {
  if (!data || data.length === 0) {
    return <p>No long vs short data yet</p>;
  }

  return (
    <div className="chart-card">
      <h3>Long vs Short Performance</h3>

      <table className="trade-table">
        <thead>
          <tr>
            <th>Side</th>
            <th>Trades</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate (%)</th>
            <th>Total PnL</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.side}>
              <td>{row.side}</td>
              <td>{row.trades}</td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td>{row.winRate}</td>
              <td>{row.totalPnl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LongVsShortStats;