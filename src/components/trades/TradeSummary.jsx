function TradeSummary({ trade }) {
  if (!trade) {
    return null;
  }

  return (
    <div className="chart-card">
      <h3>Trade Summary</h3>

      <p><strong>Ticker:</strong> {trade.ticker}</p>
      <p><strong>Direction:</strong> {trade.direction}</p>
      <p><strong>Date:</strong> {trade.date}</p>
      <p><strong>Entry Time:</strong> {trade.entry_time}</p>
      <p><strong>Exit Time:</strong> {trade.exit_time}</p>
      <p><strong>Entry Price:</strong> {trade.entry_price}</p>
      <p><strong>Exit Price:</strong> {trade.exit_price}</p>
      <p><strong>Shares:</strong> {trade.shares}</p>
      <p><strong>PnL:</strong> {trade.pnl}</p>
      <p><strong>Setup:</strong> {trade.setup || "Unclassified"}</p>
      <p><strong>Notes:</strong> {trade.notes || "-"}</p>
    </div>
  );
}

export default TradeSummary;