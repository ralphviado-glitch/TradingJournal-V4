function SetupQualityFeedback({ data }) {
  if (!data || data.length === 0) {
    return <p>No setup quality feedback yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Setup Quality Feedback</h3>

      <table className="trade-table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Trades</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate (%)</th>
            <th>Total PnL</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.grade}>
              <td>{row.grade}</td>
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

export default SetupQualityFeedback;