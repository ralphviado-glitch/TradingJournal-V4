import { useState } from "react";
import Badge from "../ui/Badge";
import Modal from "../ui/Modal";
import OrderBreakdown from "./OrderBreakdown";
import QuickReviewForm from "./QuickReviewForm";

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number >= 0 ? "+" : "-"}$${Math.abs(number).toFixed(2)}`;
}

// Kept as a read-only compatibility export for historical-plan consumers.
export function DetailedPlanSnapshot({ trade }) {
  const match = (value) => value == null ? "Unknown" : value ? "Yes" : "No";
  const scenario = (side) => <section className={`review-plan-scenario ${side}`}><h5>{side.toUpperCase()} PLAN</h5>{trade[`planned_${side}_scenario_enabled`] == null ? <p>Historical scenario data unavailable.</p> : trade[`planned_${side}_scenario_enabled`] ? <><p><strong>Trigger:</strong> {trade[`planned_${side}_trigger`] || "Not specified"}</p><p><strong>Setup:</strong> {trade[`planned_${side}_setup`] || "Not specified"}</p><p><strong>Target:</strong> {trade[`planned_${side}_target`] || "Not specified"}</p><p><strong>Invalidation:</strong> {trade[`planned_${side}_invalidation`] || "Not specified"}</p></> : <p>Not planned.</p>}</section>;
  return <div className="detailed-plan-snapshot"><div className="review-plan-context"><p><strong>PLANNED:</strong> {String(trade.planned_direction || "Unknown").toUpperCase()}</p><p><strong>ACTUAL:</strong> {String(trade.direction || "Unknown").toUpperCase()}</p><p>{trade.planned_overall_rating || "Unrated"} · {trade.planned_weekly_bias || "Weekly bias unknown"} · {trade.planned_intraday_bias || "Intraday bias unknown"}</p><p>{trade.planned_relative_strength || "Relative strength unknown"} · {trade.planned_confidence || "Confidence unknown"}</p><p>Preferred Direction Match: {match(trade.preferred_direction_matched ?? trade.direction_matched)} · Scenario Match: {match(trade.planned_scenario_matched)} · {trade.plan_direction_classification || "Unknown"}</p></div><div className="review-plan-scenario-grid">{scenario("long")}{scenario("short")}</div><p><strong>Bottom Line:</strong> {trade.planned_bottom_line || trade.planned_notes || "Not captured."}</p></div>;
}

function TradeReviewModal({
  trade, onClose,
  nextTrade, onNextTrade, onSaveReview, isSavingTrade,
}) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  if (!trade) return null;
  const pnl = Number(trade.pnl || 0);
  const result = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven";

  return (
    <Modal title={`${trade.ticker} ${String(trade.direction || "").toUpperCase()}`} onClose={onClose} className="trade-review-modal">
      <div className="trade-review-modal-heading">
        <div>
          <h2>{trade.ticker} {String(trade.direction || "").toUpperCase()}</h2>
          <p>{trade.trade_date || trade.date}</p>
          <div className="review-badges">
            <Badge tone={trade.direction === "Short" ? "warning" : "neutral"}>{trade.direction || "N/A"}</Badge>
            <Badge tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : "warning"}>{result}</Badge>
            <Badge tone={trade.review_status === "Reviewed" ? "profit" : "warning"}>{trade.review_status || "Not Reviewed"}</Badge>
          </div>
        </div>
        <strong className={pnl >= 0 ? "result-win" : "result-loss"}>{formatMoney(pnl)}</strong>
      </div>

      <QuickReviewForm
        key={trade.id}
        trade={trade}
        onSave={(payload) => onSaveReview?.(trade.id, payload)}
        onSaveNext={nextTrade ? async (payload) => { const saved = await onSaveReview?.(trade.id, payload); onNextTrade?.(nextTrade); return saved; } : null}
        onCancel={onClose}
        isSaving={isSavingTrade}
      >
      <div className="review-evidence-grid">
        <section className="review-detail-section" aria-labelledby="screenshot-heading">
          <h3 id="screenshot-heading">Screenshots</h3>
          {trade.screenshot ? <><button className="review-screenshot-button" type="button" onClick={() => setShowScreenshot((current) => !current)} aria-expanded={showScreenshot}><img src={trade.screenshot} alt={`${trade.ticker} trade screenshot`} /><span>{showScreenshot ? "Hide large preview" : "View large preview"}</span></button>{showScreenshot ? <div className="review-screenshot-preview"><img src={trade.screenshot} alt={`${trade.ticker} trade screenshot enlarged`} /></div> : null}</> : <p className="field-helper">No screenshot attached.</p>}
        </section>
        <OrderBreakdown orders={trade.orders} />
      </div>
      </QuickReviewForm>
    </Modal>
  );
}

export default TradeReviewModal;
