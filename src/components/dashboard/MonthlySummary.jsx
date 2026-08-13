function MonthlySummary({ summary }) {
  if (!summary || summary.length === 0) {
    return <p>No monthly summary yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Monthly Performance Summary</h3>

      <ul>
        {summary.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default MonthlySummary;