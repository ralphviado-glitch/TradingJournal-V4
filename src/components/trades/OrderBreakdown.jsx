function OrderBreakdown({ orders }) {
  if (!orders || orders.length === 0) {
    return <p>No order breakdown available.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Order Breakdown</h3>

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
  );
}

export default OrderBreakdown;