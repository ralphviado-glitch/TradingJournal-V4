function NextWeekFocus({ focus }) {
  if (!focus || focus.length === 0) {
    return <p>No next-week focus generated yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Next-Week Focus</h3>

      <ul>
        {focus.map((item, index) =>
          item === "" ? (
            <br key={index} />
          ) : (
            <li key={index}>{item}</li>
          )
        )}
      </ul>
    </div>
  );
}

export default NextWeekFocus;