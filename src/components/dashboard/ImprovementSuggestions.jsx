function ImprovementSuggestions({ suggestions }) {
  if (!suggestions || suggestions.length === 0) {
    return <p>No improvement suggestions yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Improvement Suggestions</h3>

      <ul>
        {suggestions.map((suggestion, index) => (
          <li key={index}>{suggestion}</li>
        ))}
      </ul>
    </div>
  );
}

export default ImprovementSuggestions;