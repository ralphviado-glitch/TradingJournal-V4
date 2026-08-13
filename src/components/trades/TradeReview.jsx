function TradeReview({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return <p>No trade review available.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Trade Review</h3>

      <ul>
        {reviews.map((review, index) => (
          <li key={index}>{review}</li>
        ))}
      </ul>
    </div>
  );
}

export default TradeReview;