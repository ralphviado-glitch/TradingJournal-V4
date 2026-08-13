import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

function PerformanceByGradeChart({ data }) {
  if (!data || data.length === 0) {
    return <p>No performance by grade data yet.</p>;
  }

  return (
    <div className="chart-card">
      <h3>Performance by Grade</h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid stroke="#333" strokeDasharray="3 3" />
          <XAxis dataKey="grade" stroke="#ccc" />
          <YAxis stroke="#ccc" />
          <Tooltip />
          <Bar dataKey="totalPnl">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.totalPnl >= 0 ? "#4ade80" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceByGradeChart;