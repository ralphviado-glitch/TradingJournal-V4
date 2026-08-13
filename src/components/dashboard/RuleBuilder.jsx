function RuleBuilder({ rules }) {
  if (!rules || rules.length === 0) {
    return <p>No rules generated yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Rules From Winners</h3>

      <ul>
        {rules.map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}

export default RuleBuilder;