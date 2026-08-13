function WeeklySummary({ summary }) {
  if (!summary || summary.length === 0) {
    return <p>No weekly summary yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Weekly Performance Summary</h3>

      <ul>
        {summary.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default WeeklySummary;