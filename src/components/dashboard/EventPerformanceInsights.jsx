function EventPerformanceInsights({ data }) {
  if (!data || data.length === 0) {
    return <p>No event performance data yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Performance by Event Type</h3>

      <table className="trade-table">
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Trades</th>
            <th>Wins</th>
            <th>Win Rate (%)</th>
            <th>Total PnL</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.eventType}>
              <td>{row.eventType}</td>
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

export default EventPerformanceInsights;