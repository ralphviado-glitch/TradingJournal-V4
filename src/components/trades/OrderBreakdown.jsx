function OrderBreakdown({ orders }) {
  if (!orders || orders.length === 0) {
    return <p>No order breakdown available.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Order Breakdown</h3>
      <p className="field-helper">Times shown in New York (ET)</p>

      <div className="order-breakdown-table">
      <table className="trade-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Side</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Event</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order, index) => (
            <tr key={index}>
              <td>{order.date}</td>
              <td>{order.time}</td>
              <td>{order.side}</td>
              <td>{order.quantity}</td>
              <td>{order.price}</td>
              <td>{order.event}</td>
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
            <small>{order.event}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderBreakdown;
