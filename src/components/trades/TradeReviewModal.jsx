import { useState } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import TradeSummary from "./TradeSummary";
import OrderBreakdown from "./OrderBreakdown";
import TradeReview from "./TradeReview";
import BreakRetestReview from "./BreakRetestReview";
import { getTradeReviewCompleteness } from "../../lib/workflow/reviewCompleteness";
import QuickReviewForm from "./QuickReviewForm";

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number >= 0 ? "+" : "-"}$${Math.abs(number).toFixed(2)}`;
}

function TagList({ values, emptyText }) {
  if (!values?.length) return <span className="field-helper">{emptyText}</span>;
  return <div className="review-tags">{values.map((value) => <Badge key={value} tone="neutral">{value}</Badge>)}</div>;
}

export function DetailedPlanSnapshot({ trade }) {
  const match = (value) => value == null ? "Unknown" : value ? "Yes" : "No";
  const scenario = (side) => <section className={`review-plan-scenario ${side}`}><h5>{side.toUpperCase()} PLAN</h5>{trade[`planned_${side}_scenario_enabled`] == null ? <p>Historical scenario data unavailable.</p> : trade[`planned_${side}_scenario_enabled`] ? <><p><strong>Trigger:</strong> {trade[`planned_${side}_trigger`] || "Not specified"}</p><p><strong>Setup:</strong> {trade[`planned_${side}_setup`] || "Not specified"}</p><p><strong>Target:</strong> {trade[`planned_${side}_target`] || "Not specified"}</p><p><strong>Invalidation:</strong> {trade[`planned_${side}_invalidation`] || "Not specified"}</p></> : <p>Not planned.</p>}</section>;
  return <div className="detailed-plan-snapshot"><div className="review-plan-context"><p><strong>PLANNED:</strong> {String(trade.planned_direction || "Unknown").toUpperCase()}</p><p><strong>ACTUAL:</strong> {String(trade.direction || "Unknown").toUpperCase()}</p><p>{trade.planned_overall_rating || "Unrated"} · {trade.planned_weekly_bias || "Weekly bias unknown"} · {trade.planned_intraday_bias || "Intraday bias unknown"}</p><p>{trade.planned_relative_strength || "Relative strength unknown"} · {trade.planned_confidence || "Confidence unknown"}</p><p>Preferred Direction Match: {match(trade.preferred_direction_matched ?? trade.direction_matched)} · Scenario Match: {match(trade.planned_scenario_matched)} · {trade.plan_direction_classification || "Unknown"}</p></div><div className="review-plan-scenario-grid">{scenario("long")}{scenario("short")}</div><p><strong>Bottom Line:</strong> {trade.planned_bottom_line || trade.planned_notes || "Not captured."}</p></div>;
}

function TradeReviewModal({
  trade, reviews, marketDay, marketAlignment, onClose, onEditTrade,
  onCalculateExcursions, excursionStatus, isCalculatingExcursions,
  watchlistItems = [], onLinkWatchlist, nextTrade, onNextTrade, onSaveReview, isSavingTrade,
}) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [watchlistItemId, setWatchlistItemId] = useState("");
  if (!trade) return null;
  const pnl = Number(trade.pnl || 0);
  const result = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven";
  const completeness = getTradeReviewCompleteness(trade);
  const matchedItem = watchlistItems.find((item) => item.id === trade.watchlist_item_id);

  return (
    <Modal title={`${trade.ticker} ${String(trade.direction || "").toUpperCase()}`} onClose={onClose} className="trade-review-modal">
      <div className="trade-review-modal-heading">
        <div>
          <h2>{trade.ticker} {String(trade.direction || "").toUpperCase()}</h2>
          <p>{trade.trade_date || trade.date}</p>
          <div className="review-badges">
            <Badge tone={trade.direction === "Short" ? "warning" : "neutral"}>{trade.direction || "N/A"}</Badge>
            <Badge tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : "warning"}>{result}</Badge>
          </div>
        </div>
        <strong className={pnl >= 0 ? "result-win" : "result-loss"}>{formatMoney(pnl)}</strong>
      </div>

      <QuickReviewForm
        key={trade.id}
        trade={trade}
        onSave={(payload) => onSaveReview?.(trade.id, payload)}
        onSaveNext={nextTrade ? async (payload) => { const saved = await onSaveReview?.(trade.id, payload); onNextTrade?.(nextTrade); return saved; } : null}
        onDetailedReview={() => onEditTrade?.(trade)}
        isSaving={isSavingTrade}
        excursionStatus={excursionStatus}
        onRetryExcursion={onCalculateExcursions}
      />

      {trade.final_grade ? <section className="review-detail-section auto-grade saved-grade" aria-label="Saved review summary"><h3>Saved Review Summary</h3><div className="review-detail-grid"><div><strong>Setup Types</strong><TagList values={trade.setupTags?.map((tag)=>tag.name)} emptyText={trade.setup || "Unclassified"}/></div><div><strong>Confluences</strong><TagList values={trade.confluenceTags?.map((tag)=>tag.name)} emptyText="None"/></div><div><strong>Setup Grade</strong><span>{trade.setup_grade}</span></div><div><strong>Execution Grade</strong><span>{trade.execution_grade}</span></div><div><strong>Final Grade</strong><span>{trade.final_grade}</span></div><div><strong>Outcome</strong><span>{trade.outcome_classification}</span></div></div><p>{trade.grade_explanation}</p>{trade.review_note?<p><strong>Review Note:</strong> {trade.review_note}</p>:null}</section>:null}

      <div className="review-evidence-grid">
        <section className="review-detail-section" aria-labelledby="screenshot-heading">
          <h3 id="screenshot-heading">Screenshots</h3>
          {trade.screenshot ? <><button className="review-screenshot-button" type="button" onClick={() => setShowScreenshot((current) => !current)} aria-expanded={showScreenshot}><img src={trade.screenshot} alt={`${trade.ticker} trade screenshot`} /><span>{showScreenshot ? "Hide large preview" : "View large preview"}</span></button>{showScreenshot ? <div className="review-screenshot-preview"><img src={trade.screenshot} alt={`${trade.ticker} trade screenshot enlarged`} /></div> : null}</> : <p className="field-helper">No screenshot attached.</p>}
        </section>
        <OrderBreakdown orders={trade.orders} />
      </div>

      <details className="review-details"><summary>Automatic Execution Summary</summary><TradeSummary
        trade={trade}
        marketDay={marketDay}
        marketAlignment={marketAlignment}
        onCalculateExcursions={onCalculateExcursions}
        excursionStatus={excursionStatus}
        isCalculatingExcursions={isCalculatingExcursions}
      /></details>
      <details className="review-details"><summary>Workflow and Detailed Review</summary><section className="review-detail-section workflow-review-section" aria-labelledby="workflow-heading">
        <h3 id="workflow-heading">Workflow Status</h3>
        <div className="review-detail-grid">
          <div><strong>Processing</strong><Badge tone="neutral">{trade.processing_status || "Not evaluated"}</Badge></div>
          <div><strong>Excursion</strong><Badge tone="neutral">{trade.excursion_status || "Not evaluated"}</Badge></div>
          <div><strong>Management</strong><Badge tone="neutral">{trade.management_status || "Not evaluated"}</Badge></div>
          <div><strong>Watchlist</strong><Badge tone="neutral">{trade.watchlist_match_status || "Not checked"}{trade.watchlist_rank ? ` #${trade.watchlist_rank}` : ""}</Badge></div>
          <div><strong>Review</strong><Badge tone={completeness.status === "Review Complete" ? "profit" : "warning"}>{completeness.percentage}% · {completeness.status}</Badge></div>
        </div>
        <div className="watchlist-link-review">
          <h4>Planned Trade / Watchlist Link</h4>
          {trade.watchlist_match_status === "Matched" ? <><p>{matchedItem?.ticker || trade.ticker} · Rank {trade.watchlist_rank ?? "N/A"}</p><DetailedPlanSnapshot trade={trade} /></> : <p>No watchlist match.</p>}
          {trade.watchlist_match_status !== "Matched" ? (
            <div className="inline-link-controls">
              <label>Link to this day's watchlist<select value={watchlistItemId} onChange={(event) => setWatchlistItemId(event.target.value)}><option value="">Select watchlist item</option>{watchlistItems.map((item) => <option key={item.id} value={item.id}>#{item.priority} {item.ticker} · {item.direction}</option>)}</select></label>
              <Button variant="secondary" disabled={!watchlistItemId} onClick={() => onLinkWatchlist?.(watchlistItems.find((item) => item.id === watchlistItemId))}>Link Trade</Button>
            </div>
          ) : null}
        </div>
      </section>
      <BreakRetestReview trade={trade} />

      <section className="review-detail-section" aria-labelledby="psychology-heading">
        <h3 id="psychology-heading">Psychology / Classification</h3>
        <div className="review-detail-grid">
          <div><strong>Mistake Tags</strong><TagList values={trade.mistakeTags} emptyText="No mistake tags" /></div>
          <div><strong>Emotion Tags</strong><TagList values={trade.emotionTags} emptyText="No emotion tags" /></div>
          <div><strong>Rules Followed</strong><span>{trade.rulesFollowed == null ? "Unknown" : trade.rulesFollowed ? "Yes" : "No"}</span></div>
        </div>
      </section>

      <section className="review-detail-section" aria-labelledby="notes-heading">
        <h3 id="notes-heading">Notes</h3>
        <div className="review-notes-grid">
          <div><strong>Trade Notes</strong><p>{trade.notes || "No trade notes."}</p></div>
          <div><strong>Management Notes</strong><p>{trade.management_notes || "No management notes."}</p></div>
        </div>
      </section>

      <TradeReview reviews={reviews} />
      </details>
      <div className="trade-review-modal-footer">{nextTrade ? <Button onClick={() => onNextTrade?.(nextTrade)}>Next Trade</Button> : null}<Button variant="secondary" onClick={onClose}>Close Trade Review</Button></div>
    </Modal>
  );
}

export default TradeReviewModal;
