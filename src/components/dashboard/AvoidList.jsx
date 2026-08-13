function AvoidList({ items }) {
  if (!items || items.length === 0) {
    return <p>No avoid list generated yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Avoid List From Losers</h3>

      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default AvoidList;