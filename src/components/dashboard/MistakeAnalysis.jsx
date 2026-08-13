function MistakeAnalysis({ data }) {
  if (!data || data.length === 0) {
    return <p>No mistake data yet</p>;
  }

  const topMistakes = data.slice(0, 3);

  return (
    <div className="chart-card">
      <h3>Top Repeated Mistakes</h3>

      <table className="trade-table">
        <thead>
          <tr>
            <th>Mistake</th>
            <th>Count</th>
          </tr>
        </thead>

        <tbody>
          {topMistakes.map((row) => (
            <tr key={row.mistake}>
              <td>{row.mistake}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MistakeAnalysis;