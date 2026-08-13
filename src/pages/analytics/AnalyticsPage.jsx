import { useEffect, useMemo, useState } from "react";
import { fetchTrades } from "../../lib/tradeService";
import { createEmptyAnalyticsFilters, filterStrategyTrades } from "../../lib/analytics/analyticsFilters";
import {
  buildCategoryAnalysis, buildCombinedAlignment, buildDisplacementAnalysis,
  buildDisplacementRetestMatrix, buildExitEfficiencyAnalysis, buildProcessOutcomeAnalysis,
  buildRetestAnalysis, buildRoomAnalysis, buildRuleAdherenceAnalysis, buildRuleViolationAnalysis,
  buildSetupExecutionMatrix, buildThreeStateAnalysis, buildTickerAnalysis, summarizeTrades,
} from "../../lib/analytics/strategyAnalytics";
import { ENTRY_TRIGGERS } from "../../lib/breakRetestReview";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ActionableInsights from "../../components/analytics/ActionableInsights";
import { generateActionableInsights } from "../../lib/analytics/insightEngine";

const SETUP_QUALITIES = ["A+", "A", "B", "C", "D"];
const EXECUTION_QUALITIES = ["Excellent", "Good", "Average", "Poor"];
const METRIC_LABELS = { tradeCount: "Trade Count", winRate: "Win Rate", netPnl: "Net P&L", averagePnl: "Average P&L", averageMfeR: "Average MFE R" };

function formatMetric(value, field) {
  if (value === null || value === undefined) return "N/A";
  if (["netPnl", "averagePnl", "averageWinner", "averageLoser", "totalLosingPnl"].includes(field)) return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
  if (["winRate", "averageExitEfficiency", "percentage"].includes(field)) return `${value}%`;
  if (["averageMfeR", "averageMaeR", "averageRealizedR"].includes(field)) return `${value}R`;
  return value;
}

function Sample({ row }) {
  return <span className="analytics-sample"><strong>{row.tradeCount}</strong><small>{row.sampleLabel}</small></span>;
}

function AnalyticsTable({ rows, fields = ["winRate", "netPnl", "averagePnl"], firstLabel = "Category" }) {
  return <div className="analytics-table-scroll"><table className="analytics-table"><thead><tr><th>{firstLabel}</th><th>Sample</th>{fields.map((field) => <th key={field}>{METRIC_LABELS[field] || field.replaceAll(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.category}><td><strong>{row.category}</strong></td><td><Sample row={row} /></td>{fields.map((field) => <td key={field}>{formatMetric(row[field], field)}</td>)}</tr>)}</tbody></table></div>;
}

export function AnalyticsCategoryList({ rows, secondaryFields = [] }) {
  return <div className="analytics-category-list">{rows.map((row) => <div className="analytics-category-row" key={row.category}>
    <strong className="analytics-category-name">{row.category}</strong>
    {row.tradeCount === 0 ? <span className="analytics-no-sample">No sample</span> : <>
      <span className="analytics-primary-metrics"><span>{row.tradeCount} trades</span><span>{formatMetric(row.winRate, "winRate")} WR</span><span className={row.netPnl > 0 ? "metric-profit" : row.netPnl < 0 ? "metric-loss" : ""}>{formatMetric(row.netPnl, "netPnl")} net</span><span>{formatMetric(row.averagePnl, "averagePnl")} avg</span></span>
      {secondaryFields.length ? <span className="analytics-secondary-metrics">{secondaryFields.map((field) => `${METRIC_LABELS[field] || field.replaceAll(/([A-Z])/g, " $1").trim()} ${formatMetric(row[field], field)}`).join(" · ")}</span> : null}
    </>}
  </div>)}</div>;
}

function Matrix({ matrix, metric }) {
  return <div className="analytics-matrix-scroll"><table className="analytics-matrix"><thead><tr><th>Quality</th>{matrix.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{matrix.data.map((row) => <tr key={row.category}><th>{row.category}</th>{row.cells.map((cell) => {
    const suppressSmallWinRate = metric === "winRate" && cell.tradeCount < 5;
    return <td key={cell.category}><strong>{cell.tradeCount && !suppressSmallWinRate ? formatMetric(cell[metric], metric) : "N/A"}</strong><small>n={cell.tradeCount} · {cell.sampleLabel}</small></td>;
  })}</tr>)}</tbody></table></div>;
}

function FilterSelect({ label, value, onChange, options }) {
  return <label>{label}<select value={value} onChange={onChange}><option value="ALL">All</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

export function AnalysisSection({ title, description, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = `analytics-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <Card className="analytics-section"><button type="button" className="analytics-section-toggle" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}><span className="analytics-section-heading"><h2>{title}</h2>{description ? <p>{description}</p> : null}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button>{expanded ? <div id={contentId} className="analytics-section-content">{children}</div> : null}</Card>;
}

function AnalyticsPage() {
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "Loading strategy analytics..." });
  const [filters, setFilters] = useState(createEmptyAnalyticsFilters);
  const [breakMatrixMetric, setBreakMatrixMetric] = useState("winRate");
  const [qualityMatrixMetric, setQualityMatrixMetric] = useState("tradeCount");
  const [violationSort, setViolationSort] = useState("netPnl");
  const [tickerSort, setTickerSort] = useState("netPnl");

  useEffect(() => {
    fetchTrades().then((data) => { setTrades(data); setStatus({ type: "success", message: "" }); }).catch((error) => {
      console.error("Failed to load analytics:", error);
      setStatus({ type: "error", message: error.message || "Failed to load analytics." });
    });
  }, []);

  const filteredTrades = useMemo(() => filterStrategyTrades(trades, filters), [trades, filters]);
  const analytics = useMemo(() => ({
    kpis: summarizeTrades(filteredTrades),
    displacement: buildDisplacementAnalysis(filteredTrades), retest: buildRetestAnalysis(filteredTrades),
    breakMatrix: buildDisplacementRetestMatrix(filteredTrades),
    qqq: buildCategoryAnalysis(filteredTrades, "qqq_alignment", ["Aligned", "Neutral", "Against", "Unknown"]),
    spy: buildCategoryAnalysis(filteredTrades, "spy_alignment", ["Aligned", "Neutral", "Against", "Unknown"]),
    market: buildCategoryAnalysis(filteredTrades, "market_alignment", ["Strong", "Mixed", "Against", "Unknown"]),
    combined: buildCombinedAlignment(filteredTrades), room: buildRoomAnalysis(filteredTrades),
    extended: buildThreeStateAnalysis(filteredTrades, "extended_before_entry"),
    afterFive: buildThreeStateAnalysis(filteredTrades, "entered_after_first_5min"),
    firstFiveBreak: buildThreeStateAnalysis(filteredTrades, "first_5min_break"),
    triggers: buildCategoryAnalysis(filteredTrades, "entry_trigger", [...ENTRY_TRIGGERS, "Unknown"]),
    violations: buildRuleViolationAnalysis(filteredTrades), qualityMatrix: buildSetupExecutionMatrix(filteredTrades),
    process: buildProcessOutcomeAnalysis(filteredTrades), exitBuckets: buildExitEfficiencyAnalysis(filteredTrades),
    exitBySetup: buildCategoryAnalysis(filteredTrades, "setup_quality", [...SETUP_QUALITIES, "Unknown"]),
    exitByExecution: buildCategoryAnalysis(filteredTrades, "execution_quality", [...EXECUTION_QUALITIES, "Unknown"]),
    adherence: buildRuleAdherenceAnalysis(filteredTrades), tickers: buildTickerAnalysis(filteredTrades),
  }), [filteredTrades]);
  const insightLayer = useMemo(() => generateActionableInsights(filteredTrades), [filteredTrades]);

  const sortedViolations = useMemo(() => [...analytics.violations].sort((a, b) => violationSort === "tradeCount" ? b.tradeCount - a.tradeCount : (a[violationSort] ?? Infinity) - (b[violationSort] ?? Infinity)), [analytics.violations, violationSort]);
  const sortedTickers = useMemo(() => [...analytics.tickers].sort((a, b) => tickerSort === "category" ? a.category.localeCompare(b.category) : (b[tickerSort] ?? -Infinity) - (a[tickerSort] ?? -Infinity)), [analytics.tickers, tickerSort]);
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));

  if (status.type === "loading") return <p className="status-message loading">{status.message}</p>;
  if (status.type === "error") return <p className="status-message error">{status.message}</p>;
  if (trades.length === 0) return <div className="analytics-page"><header className="analytics-header"><h1>Break &amp; Retest Strategy Analytics</h1></header><p className="empty-state">No trade data available.</p></div>;

  const kpiCards = [
    ["Total Trades", analytics.kpis.tradeCount, "tradeCount"], ["Win Rate", analytics.kpis.winRate, "winRate"], ["Net P&L", analytics.kpis.netPnl, "netPnl"],
    ["Average P&L", analytics.kpis.averagePnl, "averagePnl"], ["Average Winner", analytics.kpis.averageWinner, "averageWinner"], ["Average Loser", analytics.kpis.averageLoser, "averageLoser"],
    ["Profit Factor", analytics.kpis.profitFactor, "profitFactor"], ["Average Exit Efficiency", analytics.kpis.averageExitEfficiency, "averageExitEfficiency"],
    ["Average MFE R", analytics.kpis.averageMfeR, "averageMfeR"], ["Average MAE R", analytics.kpis.averageMaeR, "averageMaeR"],
    ["Average Rule Adherence", analytics.kpis.averageRuleAdherence, "averageRuleAdherence"], ["Average Execution Score", analytics.kpis.averageExecutionScore, "averageExecutionScore"],
  ];

  return <div className="analytics-page">
    <header className="analytics-header"><p className="eyebrow">Phase 4A</p><h1>Break &amp; Retest Strategy Analytics</h1><p>Observed relationships in your journal data. These statistics describe correlation, not causation.</p></header>
    <Card className="analytics-filters"><div className="section-header"><div><h2>Filters</h2><p>{filteredTrades.length} of {trades.length} trades included</p></div><Button variant="secondary" onClick={() => setFilters(createEmptyAnalyticsFilters())}>Reset Filters</Button></div><div className="analytics-filter-grid">
      <label>Start Date<input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} /></label>
      <label>End Date<input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} /></label>
      <label>Ticker<input type="text" value={filters.ticker} placeholder="Search ticker..." autoComplete="off" onChange={(event) => updateFilter("ticker", event.target.value)} /></label>
      <FilterSelect label="Direction" value={filters.direction} onChange={(event) => updateFilter("direction", event.target.value)} options={["Long", "Short"]} />
      <FilterSelect label="Setup Quality" value={filters.setupQuality} onChange={(event) => updateFilter("setupQuality", event.target.value)} options={SETUP_QUALITIES} />
      <FilterSelect label="Execution Quality" value={filters.executionQuality} onChange={(event) => updateFilter("executionQuality", event.target.value)} options={EXECUTION_QUALITIES} />
      <FilterSelect label="Result" value={filters.result} onChange={(event) => updateFilter("result", event.target.value)} options={["Win", "Loss"]} />
      <FilterSelect label="Break & Retest Only" value={filters.breakRetestOnly} onChange={(event) => updateFilter("breakRetestOnly", event.target.value)} options={["Yes", "No"]} />
    </div></Card>

    <div className="analytics-kpi-grid">{kpiCards.map(([label, metric, field]) => <Card className="analytics-kpi" key={label}><small>{label}</small><strong>{formatMetric(metric, field)}</strong></Card>)}</div>
    <ActionableInsights insights={insightLayer} trades={filteredTrades} />

    <AnalysisSection title="Break & Retest Quality" description="Displacement and retest statistics keep Unknown and explicit absence separate." defaultExpanded>
      <div className="analytics-two-column"><div><h3>Displacement</h3><AnalyticsCategoryList rows={analytics.displacement} secondaryFields={["averageMfeR", "averageRealizedR"]} /></div><div><h3>Retest Quality</h3><AnalyticsCategoryList rows={analytics.retest} secondaryFields={["averageExitEfficiency", "averageMfeR", "averageRuleAdherence"]} /></div></div>
      <div className="analytics-subsection"><div className="analytics-control-row"><h3>Displacement × Retest Matrix</h3><label>Metric<select value={breakMatrixMetric} onChange={(event) => setBreakMatrixMetric(event.target.value)}>{Object.entries(METRIC_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><Matrix matrix={analytics.breakMatrix} metric={breakMatrixMetric} /></div>
    </AnalysisSection>

    <AnalysisSection title="Market Alignment"><div className="analytics-analysis-grid"><div><h3>QQQ</h3><AnalyticsCategoryList rows={analytics.qqq} /></div><div><h3>SPY</h3><AnalyticsCategoryList rows={analytics.spy} /></div><div><h3>Overall</h3><AnalyticsCategoryList rows={analytics.market} /></div><div><h3>QQQ + SPY</h3><AnalyticsCategoryList rows={analytics.combined} /></div></div></AnalysisSection>

    <AnalysisSection title="Location / Room" description="Room buckets are configured centrally and use reviewed distance in R."><AnalyticsTable rows={analytics.room} fields={["winRate", "averagePnl", "netPnl", "averageMfeR"]} /></AnalysisSection>

    <AnalysisSection title="Entry Behavior"><div className="analytics-analysis-grid"><div><h3>Extended Before Entry</h3><AnalyticsCategoryList rows={analytics.extended} secondaryFields={["averageMaeR", "averageMfeR"]} /></div><div><h3>Entered After First 5 Minutes</h3><AnalyticsCategoryList rows={analytics.afterFive} /></div><div><h3>First 5-Min Break</h3><AnalyticsCategoryList rows={analytics.firstFiveBreak} /></div><div><h3>Entry Trigger</h3><AnalyticsCategoryList rows={analytics.triggers} secondaryFields={["averageMfeR", "averageMaeR"]} /></div></div></AnalysisSection>

    <AnalysisSection title="Rule Violations" description="Default order shows the largest negative observed net P&L impact first."><div className="analytics-control-row"><span /><label>Sort by<select value={violationSort} onChange={(event) => setViolationSort(event.target.value)}><option value="netPnl">Net P&amp;L Impact</option><option value="tradeCount">Frequency</option><option value="averagePnl">Average P&amp;L</option></select></label></div><AnalyticsTable rows={sortedViolations} fields={["winRate", "netPnl", "averagePnl", "totalLosingPnl", "averageRuleAdherence"]} firstLabel="Violation" /></AnalysisSection>

    <AnalysisSection title="Setup vs Execution"><div className="analytics-control-row"><p>Is the setup weak, or is execution reducing the value of good setups?</p><label>Metric<select value={qualityMatrixMetric} onChange={(event) => setQualityMatrixMetric(event.target.value)}>{["tradeCount", "winRate", "netPnl", "averagePnl"].map((key) => <option key={key} value={key}>{METRIC_LABELS[key]}</option>)}</select></label></div><Matrix matrix={analytics.qualityMatrix} metric={qualityMatrixMetric} /></AnalysisSection>

    <AnalysisSection title="Process vs Outcome" description="Good Process requires Setup Quality A+/A and Execution Quality Excellent/Good. Missing quality or breakeven results remain Unclassified."><AnalyticsTable rows={analytics.process} fields={["percentage", "netPnl"]} /></AnalysisSection>

    <AnalysisSection title="Exit Management"><div className="analytics-analysis-grid"><div><h3>Exit Efficiency Buckets</h3><AnalyticsTable rows={analytics.exitBuckets} fields={["averagePnl", "averageMfeR", "averageMaeR"]} /></div><div><h3>By Setup Quality</h3><AnalyticsTable rows={analytics.exitBySetup} fields={["averageExitEfficiency"]} /></div><div><h3>By Execution Quality</h3><AnalyticsTable rows={analytics.exitByExecution} fields={["averageExitEfficiency"]} /></div><div><h3>Rule Adherence Buckets</h3><AnalyticsTable rows={analytics.adherence} fields={["winRate", "averagePnl", "netPnl"]} /></div></div></AnalysisSection>

    <AnalysisSection title="Ticker Performance"><div className="analytics-control-row"><span /><label>Sort by<select value={tickerSort} onChange={(event) => setTickerSort(event.target.value)}><option value="netPnl">Net P&amp;L</option><option value="tradeCount">Trade Count</option><option value="winRate">Win Rate</option><option value="category">Ticker</option></select></label></div><AnalyticsTable rows={sortedTickers} fields={["winRate", "netPnl", "averagePnl", "averageMfeR", "averageMaeR", "averageExitEfficiency", "averageRuleAdherence", "averageExecutionScore"]} firstLabel="Ticker" /></AnalysisSection>
  </div>;
}

export default AnalyticsPage;
