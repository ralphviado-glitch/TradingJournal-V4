import { getExecutionAnalysis } from "../../lib/executionAnalysis";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { getManagementSummary } from "../../lib/tradeManagement";
import { getAuthoritativePnl } from "../../lib/tradePnl";

function TradeSummary({
  trade,
  marketDay,
  marketAlignment,
  onCalculateExcursions,
  excursionStatus,
  isCalculatingExcursions,
}) {
  if (!trade) {
    return null;
  }

  const executionAnalysis = getExecutionAnalysis(trade);
  const managementSummary = getManagementSummary(trade);
  const efficiencyClass = `efficiency-${executionAnalysis.exitEfficiencyRating
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}`;
  const formatValue = (value) => (value === null || value === undefined || value === "" ? "-" : value);
  const formatSigned = (value) => {
    if (value === null || value === undefined) return "-";
    return value > 0 ? `+${value}` : value;
  };
  const formatMoney = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return `${number >= 0 ? "+" : "-"}$${Math.abs(number).toFixed(2)}`;
  };
  const formatR = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return `${number >= 0 ? "+" : ""}${number}R`;
  };
  const formatPerShare = (value) => {
    const signed = formatSigned(value);
    return signed === "-" ? "-" : `${signed}/share`;
  };
  const toDisplayNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const importedEntry = toDisplayNumber(trade.entry_price);
  const actualStop = toDisplayNumber(trade.actual_stop);
  const shares = toDisplayNumber(trade.shares);
  const derivedActualRisk =
    importedEntry !== null && actualStop !== null && shares !== null
      ? Math.abs(importedEntry - actualStop) * shares
      : null;
  const authoritativePnl = getAuthoritativePnl(trade);
  const outcome = Number(authoritativePnl || 0) > 0 ? "Win" : Number(authoritativePnl || 0) < 0 ? "Loss" : "Breakeven";
  const processTone = ["A+", "A", "B"].includes(trade.setup_quality) && ["Excellent", "Good"].includes(trade.execution_quality) ? "Strong process" : trade.setup_quality || trade.execution_quality ? "Process needs review" : "Not rated";

  return (
    <Card className="trade-summary-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Trade Review</p>
          <h3>{trade.ticker} {trade.direction}</h3>
        </div>
        <Badge tone={Number(authoritativePnl || 0) >= 0 ? "profit" : "loss"}>
          {formatMoney(authoritativePnl)}
        </Badge>
      </div>
      <div className="imported-execution-grid"><p><strong>Gross P&amp;L</strong><span>{formatMoney(trade.gross_pnl ?? trade.pnl)}</span></p><p><strong>Fees</strong><span>{trade.fees == null ? "N/A" : formatMoney(trade.fees)}</span></p><p><strong>Net P&amp;L</strong><span>{trade.net_pnl == null && trade.fees == null ? "Unavailable (gross shown)" : formatMoney(authoritativePnl)}</span></p></div>

      <div className="trade-overview-grid">
        <p><strong>Date</strong><span>{trade.trade_date || trade.date}</span></p>
        <p><strong>Entry</strong><span>{trade.entry_price}</span></p>
        <p><strong>Exit</strong><span>{trade.exit_price}</span></p>
        <p><strong>Shares</strong><span>{trade.shares}</span></p>
        <p><strong>Setup</strong><span>{trade.setup || "Unclassified"}</span></p>
        <p><strong>Grade</strong><span>{trade.grade || "-"}</span></p>
      </div>

      <div className="section-header compact">
        <div>
          <p className="eyebrow">Execution Analysis</p>
          <h3>Automatic Excursion Review</h3>
        </div>
        <Button
          variant="secondary"
          isLoading={isCalculatingExcursions}
          onClick={() => onCalculateExcursions?.(trade)}
        >
          {["Failed", "Unavailable"].includes(trade.excursion_status) ? "Retry Excursion" : "Calculate Excursions"}
        </Button>
      </div>

      {excursionStatus?.message ? (
        <p className={`status-message ${excursionStatus.type}`}>{excursionStatus.message}</p>
      ) : null}

      <div className="execution-grid">
        <div className="execution-panel">
          <h4>Planned</h4>
          <p><strong>Entry</strong><span>{formatValue(trade.planned_entry)}</span></p>
          <p><strong>Stop</strong><span>{formatValue(trade.planned_stop)}</span></p>
          <p><strong>Target</strong><span>{formatValue(trade.planned_target)}</span></p>
          <p><strong>Risk</strong><span>{formatValue(trade.planned_risk)}</span></p>
        </div>

        <div className="execution-panel">
          <h4>Actual</h4>
          <p>
            <strong>Entry</strong>
            <span>{formatValue(trade.entry_price)} <small>Imported</small></span>
          </p>
          <p><strong>Stop</strong><span>{formatValue(trade.actual_stop)}</span></p>
          <p>
            <strong>Exit</strong>
            <span>{formatValue(trade.exit_price)} <small>Imported</small></span>
          </p>
          <p><strong>Risk</strong><span>{formatMoney(derivedActualRisk ?? trade.actual_risk)}</span></p>
        </div>

        <div className="execution-panel">
          <h4>Excursion</h4>
          <p><strong>MFE</strong><span>{formatPerShare(trade.mfe_per_share ?? trade.mfe)}</span></p>
          <p><strong>MFE $</strong><span>{formatMoney(trade.mfe_dollars)}</span></p>
          <p><strong>MFE R</strong><span>{formatR(trade.mfe_r)}</span></p>
          <p><strong>MAE</strong><span>{formatPerShare(trade.mae_per_share ?? trade.mae)}</span></p>
          <p><strong>MAE $</strong><span>{formatMoney(trade.mae_dollars)}</span></p>
          <p><strong>MAE R</strong><span>{formatR(trade.mae_r)}</span></p>
          <p><strong>Highest</strong><span>{formatValue(trade.highest_price_during_trade)}</span></p>
          <p><strong>Lowest</strong><span>{formatValue(trade.lowest_price_during_trade)}</span></p>
        </div>

        <div className="execution-panel">
          <h4>Summary</h4>
          <p><strong>Entry Dev</strong><span>{formatSigned(executionAnalysis.entryDeviation)}</span></p>
          <p><strong>Stop Dev</strong><span>{formatSigned(executionAnalysis.stopDeviation)}</span></p>
          <p><strong>Target Dev</strong><span>{formatSigned(executionAnalysis.targetDeviation)}</span></p>
          <p>
            <strong>Exit Efficiency</strong>
            <span className={`efficiency-badge ${efficiencyClass}`}>
              {executionAnalysis.exitEfficiency === null ? "N/A" : `${executionAnalysis.exitEfficiency}%`}
              {" "}
              {executionAnalysis.exitEfficiencyRating}
            </span>
          </p>
        </div>
      </div>

      <div className="execution-summary">
        <h4>Execution Summary</h4>
        <p><strong>Planned entry:</strong> {formatValue(trade.planned_entry)}</p>
        <p><strong>Actual entry:</strong> {formatValue(trade.entry_price)} Imported</p>
        <p><strong>Deviation:</strong> {formatSigned(executionAnalysis.entryDeviation)}</p>
        <p><strong>MFE:</strong> {formatR(trade.mfe_r)}</p>
        <p><strong>MAE:</strong> {formatR(trade.mae_r)}</p>
        <p>
          <strong>Exit efficiency:</strong>{" "}
          {executionAnalysis.exitEfficiency === null ? "-" : `${executionAnalysis.exitEfficiency}%`}
        </p>
      </div>

      <div className="section-header compact">
        <div><p className="eyebrow">Trade Management</p><h3>Planned vs Actual</h3></div>
        {trade.scaleOutSource === "imported_orders" ? <Badge tone="neutral">From imported fills</Badge> : null}
      </div>
      <div className="management-review-grid">
        <div className="execution-panel">
          <h4>Initial Position</h4>
          <p><strong>Shares</strong><span>{formatValue(trade.shares)}</span></p>
        </div>
        <div className="execution-panel">
          <h4>Planned</h4>
          <p><strong>First Scale</strong><span>{formatValue(trade.planned_first_scale_percent)}% @ {formatValue(trade.planned_first_scale_price)}</span></p>
          <p><strong>Runner</strong><span>{formatValue(trade.planned_runner_percent)}% → {formatValue(trade.planned_runner_target)}</span></p>
        </div>
        <div className="execution-panel">
          <h4>Actual</h4>
          <p><strong>First Scale</strong><span>{formatValue(trade.first_scale_shares)} shares · {formatValue(trade.first_scale_percent)}% @ {formatValue(trade.first_scale_price)}</span></p>
          <p><strong>Runner</strong><span>{formatValue(trade.runner_shares)} shares · {formatValue(trade.runner_percent)}% @ {formatValue(trade.runner_exit_price)}</span></p>
        </div>
        <div className="execution-panel">
          <h4>Management Summary</h4>
          <p><strong>First Scale Deviation</strong><span>{formatSigned(managementSummary.firstScaleDeviation)}</span></p>
          <p><strong>Runner Deviation</strong><span>{formatSigned(managementSummary.runnerDeviation)}</span></p>
          <p><strong>First-scale P&amp;L</strong><span>{formatMoney(managementSummary.firstScalePnl)}</span></p>
          <p><strong>Runner P&amp;L</strong><span>{formatMoney(managementSummary.runnerPnl)}</span></p>
          <p><strong>Runner Contribution</strong><span>{managementSummary.runnerContribution === null ? "-" : `${managementSummary.runnerContribution}%`}</span></p>
        </div>
      </div>
      {trade.management_notes ? <p className="management-notes"><strong>Management Notes:</strong> {trade.management_notes}</p> : null}

      <div className="section-header compact"><div><p className="eyebrow">Quality Review</p><h3>Process Quality vs Financial Outcome</h3></div></div>
      <p className="field-helper">Setup and execution describe the decision process, not whether the trade made money.</p>
      <div className="quality-result-card">
        <div><small>Process</small><strong>{processTone}</strong></div>
        <div><small>Setup Quality</small><strong>{trade.setup_quality || "Not rated"}</strong></div>
        <div><small>Execution Quality</small><strong>{trade.execution_quality || "Not rated"}</strong></div>
        <div className="quality-score"><small>Execution Score</small><strong>{trade.execution_score == null ? "—" : `${trade.execution_score}/100`}</strong></div>
        <div><small>Outcome</small><strong className={`result-${outcome.toLowerCase()}`}>{outcome}</strong></div>
      </div>

      <h3>Market Context</h3>

      {marketDay ? (
        <>
          <p><strong>Market Condition:</strong> {marketDay.market_condition || "-"}</p>
          <p><strong>SPY Bias:</strong> {marketDay.spy_bias || "-"}</p>
          <p><strong>QQQ Bias:</strong> {marketDay.qqq_bias || "-"}</p>
          <p><strong>Market Alignment:</strong> {marketAlignment || "Unknown"}</p>

          <h4>SPY Levels</h4>
          <p><strong>SPY PDH:</strong> {marketDay.spy_pdh ?? "-"}</p>
          <p><strong>SPY PDL:</strong> {marketDay.spy_pdl ?? "-"}</p>
          <p><strong>SPY PMH:</strong> {marketDay.spy_pmh ?? "-"}</p>
          <p><strong>SPY PML:</strong> {marketDay.spy_pml ?? "-"}</p>
          <p><strong>SPY Liquidity Target:</strong> {marketDay.spy_liquidity_target || "-"}</p>

          <h4>QQQ Levels</h4>
          <p><strong>QQQ PDH:</strong> {marketDay.qqq_pdh ?? "-"}</p>
          <p><strong>QQQ PDL:</strong> {marketDay.qqq_pdl ?? "-"}</p>
          <p><strong>QQQ PMH:</strong> {marketDay.qqq_pmh ?? "-"}</p>
          <p><strong>QQQ PML:</strong> {marketDay.qqq_pml ?? "-"}</p>
          <p><strong>QQQ Liquidity Target:</strong> {marketDay.qqq_liquidity_target || "-"}</p>

          <p><strong>Market Notes:</strong> {marketDay.notes || "-"}</p>
        </>
      ) : (
        <p>No market context saved for this trade date.</p>
      )}
    </Card>
  );
}

export default TradeSummary;
