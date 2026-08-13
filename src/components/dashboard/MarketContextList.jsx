function MarketContextList({ marketDays }) {
  if (!marketDays || marketDays.length === 0) {
    return <p>No market context saved yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Saved Market Context</h3>

      <table className="trade-table">
        <thead>
            <tr>
                <th>Date</th>

                <th>Market Condition</th>

                <th>SPY Bias</th>
                <th>SPY PDH</th>
                <th>SPY PDL</th>
                <th>SPY PMH</th>
                <th>SPY PML</th>
                <th>SPY Target</th>

                <th>QQQ Bias</th>
                <th>QQQ PDH</th>
                <th>QQQ PDL</th>
                <th>QQQ PMH</th>
                <th>QQQ PML</th>
                <th>QQQ Target</th>

                <th>Event Type</th>
                <th>Event Name</th>

                <th>Notes</th>
            </tr>
        </thead>

        <tbody>
          {marketDays.map((day) => (
            <tr key={day.id}>
                <td>{day.trade_date}</td>

                <td>{day.market_condition}</td>

                <td>{day.spy_bias}</td>
                <td>{day.spy_pdh ?? "-"}</td>
                <td>{day.spy_pdl ?? "-"}</td>
                <td>{day.spy_pmh ?? "-"}</td>
                <td>{day.spy_pml ?? "-"}</td>
                <td>{day.spy_liquidity_target || "-"}</td>

                <td>{day.qqq_bias}</td>
                <td>{day.qqq_pdh ?? "-"}</td>
                <td>{day.qqq_pdl ?? "-"}</td>
                <td>{day.qqq_pmh ?? "-"}</td>
                <td>{day.qqq_pml ?? "-"}</td>
                <td>{day.qqq_liquidity_target || "-"}</td>

                <td>{day.event_type || "-"}</td>
                <td>{day.event_name || "-"}</td>

                <td>{day.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MarketContextList;