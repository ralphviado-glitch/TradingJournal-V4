function MarketContextInsights({ data }) {
  if (!data || data.length === 0) {
    return <p>No market context insights yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Market Context Insights</h3>

      <table className="trade-table">
        <thead>
          <tr>
            <th>Market Condition</th>
            <th>Trades</th>
            <th>Wins</th>
            <th>Win Rate (%)</th>
            <th>Total PnL</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.condition}>
              <td>{row.condition}</td>
              <td>{row.trades}</td>
              <td>{row.wins}</td>
              <td>{row.winRate}</td>
              <td>{Number(row.pnl).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MarketContextInsights;