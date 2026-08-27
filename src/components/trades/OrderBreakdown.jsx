function OrderBreakdown({ orders }) {
  if (!orders || orders.length === 0) {
    return <div className="chart-card"><h3>Order Breakdown</h3><p>No order breakdown available.</p></div>;
  }

  return (
    <div className="chart-card">
      <h3>Order Breakdown</h3>
      <p className="field-helper">Times shown in New York (ET)</p>

      <div className="order-breakdown-table">
      <table className="trade-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Side</th>
            <th>QTY</th>
            <th>Price</th>
            <th>Comms</th>
            <th>P&amp;L</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order, index) => (
            <tr key={index}>
              <td>{order.time}</td>
              <td>{order.side}</td>
              <td className="numeric">{order.quantity}</td>
              <td className="numeric">{order.price}</td>
              <td className="numeric">{order.commission == null ? "N/A" : `$${Number(order.commission).toFixed(2)}`}</td>
              <td className="numeric">{order.pnl == null && order.realized_pnl == null ? "—" : `$${Number(order.pnl ?? order.realized_pnl).toFixed(2)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="order-breakdown-cards">
        {orders.map((order, index) => (
          <div className="order-breakdown-card" key={index}>
            <strong>{order.side} {order.quantity} @ {order.price}</strong>
            <span>{order.date} {order.time}</span>
            <small>{order.event}{order.commission == null ? "" : ` · $${Number(order.commission).toFixed(2)} commission`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderBreakdown;
