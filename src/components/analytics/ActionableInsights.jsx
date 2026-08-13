import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { buildWeeklyReview, formatWeeklyReview, listTradingWeeks } from "../../lib/analytics/insightEngine";

const TREND_LABELS = {
  Improving: { symbol: "↑", className: "trend-improving" },
  Stable: { symbol: "→", className: "trend-stable" },
  Deteriorating: { symbol: "↓", className: "trend-deteriorating" },
  "N/A": { symbol: "—", className: "trend-na" },
};
const METRIC_NAMES = { winRate: "Win Rate", averagePnl: "Average P&L", averageRuleAdherence: "Rule Adherence", averageExecutionScore: "Execution Score", averageExitEfficiency: "Exit Efficiency", goodProcessPercentage: "Good Process", averageMfeR: "Average MFE R", averageMaeR: "Average MAE R" };

function value(value, type = "number") {
  if (value === null || value === undefined) return "N/A";
  if (type === "money") return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
  if (type === "percent") return `${value}%`;
  return value;
}

function InsightCard({ insight }) {
  const row = insight.supportingData || {};
  return <article className={`insight-card insight-${insight.severity}`}>
    <small>{insight.category}</small><h3>{insight.title}</h3><p>{insight.description}</p>
    <div className="insight-metrics">
      {row.netPnl !== undefined ? <span><strong>{value(row.netPnl, "money")}</strong><small>Net P&amp;L</small></span> : null}
      {row.averagePnl !== undefined ? <span><strong>{value(row.averagePnl, "money")}</strong><small>Average P&amp;L</small></span> : null}
      {row.winRate !== undefined ? <span><strong>{value(row.winRate, "percent")}</strong><small>Win Rate</small></span> : null}
      {row.totalRunnerPnl !== undefined ? <span><strong>{value(row.totalRunnerPnl, "money")}</strong><small>Runner P&amp;L</small></span> : null}
    </div>
    <footer><strong>{insight.sampleSize} trades</strong><span>{insight.sampleLabel}</span></footer>
  </article>;
}

function RecentProcessTrend({ rolling, streaks }) {
  const visibleMetrics = ["winRate", "averageRuleAdherence", "averageExecutionScore", "averageExitEfficiency", "goodProcessPercentage"];
  return <Card className="recent-process-panel"><div className="analytics-section-heading"><p className="eyebrow">Recent Process Trend</p><h2>Last {rolling.recent.length} Filtered Trades</h2><p>Compared with {rolling.historical.length ? `${rolling.historical.length} earlier filtered trades` : "no available historical baseline"}.</p></div>
    <div className="trend-grid">{rolling.comparisons.filter((item) => visibleMetrics.includes(item.metric)).map((item) => { const trend = TREND_LABELS[item.direction]; const type = ["winRate", "averageExitEfficiency", "goodProcessPercentage"].includes(item.metric) ? "percent" : "number"; return <div className="trend-card" key={item.metric}><small>{METRIC_NAMES[item.metric]}</small><div><strong>{value(item.recent, type)}</strong><span>vs {value(item.historical, type)}</span></div><p className={trend.className}><span aria-hidden="true">{trend.symbol}</span> {item.direction}</p></div>; })}</div>
    <div className="process-streaks"><span><strong>{streaks.consecutiveGoodProcess}</strong> consecutive Good Process</span><span><strong>{streaks.consecutivePoorProcess}</strong> consecutive Poor Process</span><span><strong>{streaks.consecutiveRuleAdherent}</strong> consecutive Rule-Adherent (85+)</span></div>
  </Card>;
}

function WeeklyReview({ trades }) {
  const weeks = useMemo(() => listTradingWeeks(trades), [trades]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const effectiveWeek = weeks.includes(selectedWeek) ? selectedWeek : weeks[0] || "";
  const review = useMemo(() => buildWeeklyReview(trades, effectiveWeek), [trades, effectiveWeek]);
  const copyReview = async () => {
    try { await navigator.clipboard.writeText(formatWeeklyReview(review)); setCopyStatus("Copied weekly review."); }
    catch { setCopyStatus("Copy failed. Select and copy the summary manually."); }
  };
  return <Card className="weekly-review-panel"><div className="analytics-control-row"><div className="analytics-section-heading"><p className="eyebrow">Weekly Review</p><h2>Filtered Weekly Summary</h2><p>This panel uses the current Analytics filters, then limits results to the selected US trading week.</p></div><label>Week<select value={effectiveWeek} onChange={(event) => setSelectedWeek(event.target.value)}>{weeks.map((week) => <option key={week} value={week}>{week}</option>)}</select></label></div>
    {review ? <><div className="weekly-kpi-grid"><span><small>Trades</small><strong>{review.tradeCount}</strong></span><span><small>Net P&amp;L</small><strong>{value(review.netPnl, "money")}</strong></span><span><small>Win Rate</small><strong>{value(review.winRate, "percent")}</strong></span><span><small>Good Process</small><strong>{value(review.goodProcessPercentage, "percent")}</strong></span><span><small>Rule Adherence</small><strong>{value(review.averageRuleAdherence)}</strong></span><span><small>Execution Score</small><strong>{value(review.averageExecutionScore)}</strong></span><span><small>Exit Efficiency</small><strong>{value(review.averageExitEfficiency, "percent")}</strong></span></div><div className="weekly-observations"><p><strong>Strongest observed pattern:</strong> {review.strongestPattern || "N/A"}</p><p><strong>Most common violation:</strong> {review.mostCommonViolation || "N/A"}</p><p><strong>Weakest reviewed process metric:</strong> {review.processImprovementArea || "N/A"}</p></div><Button variant="secondary" onClick={copyReview}>Copy Weekly Review</Button>{copyStatus ? <p className="field-helper" role="status">{copyStatus}</p> : null}</> : <p className="empty-state">No filtered trades are available for a weekly review.</p>}
  </Card>;
}

function DataQuality({ rows }) {
  return <Card className="data-quality-panel"><div className="analytics-section-heading"><p className="eyebrow">Data Quality</p><h2>Review Completion</h2></div><div className="completion-grid">{rows.map((row) => <div key={row.category}><span><strong>{row.category}</strong><small>{row.completed} of {row.total}</small></span><progress max="100" value={row.percentage || 0}>{row.percentage || 0}%</progress><strong>{row.percentage === null ? "N/A" : `${row.percentage}%`}</strong></div>)}</div></Card>;
}

function ActionableInsights({ insights, trades }) {
  const [showMore, setShowMore] = useState(false);
  const cards = showMore ? insights.all : insights.visible;
  return <section className="actionable-insights" aria-labelledby="actionable-insights-heading"><div className="analytics-section-heading"><p className="eyebrow">Actionable Insights</p><h2 id="actionable-insights-heading">Evidence-Based Observations</h2><p>Deterministic summaries from the current filters. These observations do not imply causation or predict future trades.</p></div>
    {cards.length ? <div className="insight-card-grid">{cards.map((item) => <InsightCard insight={item} key={item.id} />)}</div> : <p className="empty-state">Not enough filtered, reviewed data to promote an insight yet.</p>}
    {insights.additional.length ? <Button variant="secondary" onClick={() => setShowMore((current) => !current)}>{showMore ? "Show Fewer Insights" : `Show More Insights (${insights.additional.length})`}</Button> : null}
    <RecentProcessTrend rolling={insights.rolling} streaks={insights.streaks} />
    <WeeklyReview trades={trades} />
    <DataQuality rows={insights.dataCompleteness} />
  </section>;
}

export default ActionableInsights;
