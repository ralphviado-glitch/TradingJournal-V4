import Badge from "../ui/Badge";
import { formatThreeState } from "../../lib/breakRetestReview";

const value = (item, suffix = "") => item === null || item === undefined || item === "" ? "Unknown" : `${item}${suffix}`;

function ReviewCard({ title, children }) {
  return <div className="break-retest-card"><h4>{title}</h4>{children}</div>;
}

function ReviewValue({ label, children }) {
  return <p><strong>{label}</strong><span>{children}</span></p>;
}

function BreakRetestReview({ trade }) {
  if (!trade) return null;
  const pnl = Number(trade.pnl || 0);
  const outcome = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven";

  return (
    <section className="break-retest-review" aria-labelledby="break-retest-review-heading">
      <div className="section-header compact">
        <div><p className="eyebrow">Break &amp; Retest Review</p><h3 id="break-retest-review-heading">Structured Setup Evidence</h3></div>
        <Badge tone={pnl > 0 ? "profit" : pnl < 0 ? "loss" : "warning"}>{outcome}</Badge>
      </div>
      <p className="field-helper">Process evidence is shown separately from the financial result.</p>
      <div className="break-retest-review-grid">
        <ReviewCard title="Setup">
          <ReviewValue label="Break & Retest">{formatThreeState(trade.break_retest_setup)}</ReviewValue>
          <ReviewValue label="Direction">{value(trade.break_direction)}</ReviewValue>
          <ReviewValue label="Break Level">{value(trade.break_level_type)}{trade.break_level_price == null ? "" : ` @ ${trade.break_level_price}`}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Break Quality">
          <ReviewValue label="Displacement">{formatThreeState(trade.displacement_present)}</ReviewValue>
          <ReviewValue label="Quality">{value(trade.displacement_quality)}</ReviewValue>
          <ReviewValue label="Volume">{formatThreeState(trade.volume_confirmation)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Retest">
          <ReviewValue label="Present">{formatThreeState(trade.retest_present)}</ReviewValue>
          <ReviewValue label="Quality">{value(trade.retest_quality)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Market Alignment">
          <ReviewValue label="QQQ">{value(trade.qqq_alignment)}</ReviewValue>
          <ReviewValue label="SPY">{value(trade.spy_alignment)}</ReviewValue>
          <ReviewValue label="Overall">{value(trade.market_alignment)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Location">
          <ReviewValue label="Room">{formatThreeState(trade.room_to_next_level)}</ReviewValue>
          <ReviewValue label="Next Level">{value(trade.next_level_price)}</ReviewValue>
          <ReviewValue label="Distance">{value(trade.distance_to_next_level)}</ReviewValue>
          <ReviewValue label="Room in R">{value(trade.distance_to_next_level_r, "R")}</ReviewValue>
          <ReviewValue label="Extended">{formatThreeState(trade.extended_before_entry)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Opening Context">
          <ReviewValue label="After First 5 Min">{formatThreeState(trade.entered_after_first_5min)}</ReviewValue>
          <ReviewValue label="First 5-Min Break">{formatThreeState(trade.first_5min_break)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Entry">
          <ReviewValue label="Trigger">{value(trade.entry_trigger)}</ReviewValue>
          <ReviewValue label="Confirmation">{value(trade.entry_confirmation)}</ReviewValue>
        </ReviewCard>
        <ReviewCard title="Rule Review">
          <ReviewValue label="Adherence">{trade.rule_adherence_score == null ? "Not scored" : `${trade.rule_adherence_score} / 100`}</ReviewValue>
          <div><strong>Violations</strong><div className="review-tags">{trade.rule_violations?.length ? trade.rule_violations.map((item) => <Badge key={item} tone="warning">{item}</Badge>) : <span>None recorded</span>}</div></div>
        </ReviewCard>
      </div>
      {trade.setup_review_notes ? <div className="setup-review-notes"><strong>Review Notes</strong><p>{trade.setup_review_notes}</p></div> : null}
    </section>
  );
}

export default BreakRetestReview;
