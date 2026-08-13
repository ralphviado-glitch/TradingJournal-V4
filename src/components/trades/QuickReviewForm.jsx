import { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";
import ImageUploadField from "../ui/ImageUploadField";
import Badge from "../ui/Badge";
import { RULE_VIOLATION_OPTIONS } from "../../lib/breakRetestReview";
import { EXECUTION_QUALITY_VALUES, SETUP_QUALITY_VALUES } from "../../lib/tradeManagement";
import { getTradeReviewCompleteness } from "../../lib/workflow/reviewCompleteness";
import { buildQuickReviewPayload, createQuickReviewDraft, deriveEnteredAfterFirstFiveMinutes } from "../../lib/workflow/quickReview";

function metric(value, suffix = "") {
  return value === null || value === undefined || value === "" ? "N/A" : `${value}${suffix}`;
}

function matchText(value) { return value == null ? "Unknown" : value ? "Yes" : "No"; }

export function CompactPlanSummary({ trade }) {
  const side = String(trade.direction || "").toLowerCase();
  const enabled = trade[`planned_${side}_scenario_enabled`];
  const trigger = trade[`planned_${side}_trigger`];
  const setup = trade[`planned_${side}_setup`];
  const target = trade[`planned_${side}_target`];
  return <div className="planned-context"><Badge tone="neutral">Pre-Market Plan</Badge><p><strong>Preferred:</strong> {String(trade.planned_direction || "Unknown").toUpperCase()} · <strong>Actual:</strong> {String(trade.direction || "Unknown").toUpperCase()}</p><p>{side === "short" ? "SHORT" : "LONG"} Scenario Planned: {matchText(enabled)} · Scenario Match: {matchText(trade.planned_scenario_matched)} · Preferred Direction Match: {matchText(trade.preferred_direction_matched ?? trade.direction_matched)}</p>{enabled ? <p><strong>{side.toUpperCase()} PLAN</strong> {[trigger, setup, target && `→ ${target}`].filter(Boolean).join(" · ") || "Planned"}</p> : null}{trade.planned_bottom_line || trade.planned_notes ? <p><strong>Bottom Line:</strong> {trade.planned_bottom_line || trade.planned_notes}</p> : null}</div>;
}

function QuickReviewForm({ trade, onSave, onSaveNext, onDetailedReview, isSaving, excursionStatus, onRetryExcursion }) {
  const [draft, setDraft] = useState(() => createQuickReviewDraft(trade));
  const [message, setMessage] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const firstFieldRef = useRef(null);
  const preview = getTradeReviewCompleteness({ ...trade, ...buildQuickReviewPayload(draft) });
  const enteredAfterFive = deriveEnteredAfterFirstFiveMinutes(trade);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleViolation = (violation) => update("rule_violations", draft.rule_violations.includes(violation)
    ? draft.rule_violations.filter((item) => item !== violation) : [...draft.rule_violations, violation]);

  const save = async (advance) => {
    setMessage("");
    try {
      const saved = await (advance ? onSaveNext : onSave)(buildQuickReviewPayload(draft));
      if (!advance) setMessage(getTradeReviewCompleteness(saved || { ...trade, ...buildQuickReviewPayload(draft) }).status === "Review Complete" ? "All trades reviewed." : "Review saved.");
    } catch (error) {
      setMessage(error.message || "Review could not be saved.");
    }
  };

  return <form className="quick-review" onSubmit={(event) => { event.preventDefault(); save(false); }}>
    <section className="quick-review-context">
      <p><strong>{trade.ticker} {String(trade.direction || "").toUpperCase()}</strong><span>{trade.trade_date || trade.date} · {trade.entry_time || "N/A"}</span></p>
      <div className="quick-metric-grid">
        <p><small>P&amp;L · Imported</small><strong>{metric(trade.pnl)}</strong></p><p><small>Shares · Imported</small><strong>{metric(trade.shares)}</strong></p>
        <p><small>Entry · Imported</small><strong>{metric(trade.entry_price)}</strong></p><p><small>Exit · Imported</small><strong>{metric(trade.exit_price)}</strong></p>
        <p><small>MFE · Automatic</small><strong>{metric(trade.mfe)}</strong></p><p><small>MAE · Automatic</small><strong>{metric(trade.mae)}</strong></p>
        <p><small>MFE R · Automatic</small><strong>{metric(trade.mfe_r, "R")}</strong></p><p><small>MAE R · Automatic</small><strong>{metric(trade.mae_r, "R")}</strong></p>
        <p><small>Exit Efficiency · Automatic</small><strong>{metric(trade.exit_efficiency, "%")}</strong></p>
        <p><small>After First 5 Minutes · Derived</small><strong>{enteredAfterFive == null ? "Unknown" : enteredAfterFive ? "Yes" : "No"}</strong></p>
      </div>
      {excursionStatus?.type === "error" || trade.excursion_status === "Failed" ? <Button variant="secondary" disabled={isSaving} onClick={() => onRetryExcursion?.(trade)}>Retry Excursion</Button> : null}
      {trade.watchlist_match_status === "Matched" ? <CompactPlanSummary trade={trade} /> : null}
    </section>

    <section className="quick-review-manual">
      <div className="section-header"><div><p className="eyebrow">Manual Review</p><h3>Quick Review</h3></div><strong>{preview.completedFields} / 5 complete</strong></div>
      <progress max="5" value={preview.completedFields}>{preview.completedFields} of 5</progress>
      <p className="field-helper">{preview.status}{preview.missingFields.length ? ` · Missing: ${preview.missingFields.join(", ")}` : ""}</p>
      <fieldset disabled={isSaving} className="quick-review-fields">
        <label>Setup Quality<select ref={firstFieldRef} data-modal-initial-focus value={draft.setup_quality} onChange={(event) => update("setup_quality", event.target.value)}><option value="">Unknown</option>{SETUP_QUALITY_VALUES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Execution Quality<select value={draft.execution_quality} onChange={(event) => update("execution_quality", event.target.value)}><option value="">Unknown</option>{EXECUTION_QUALITY_VALUES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Break &amp; Retest Setup?<select value={draft.break_retest_setup} onChange={(event) => update("break_retest_setup", event.target.value)}><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
        <label>Rule Adherence Score<input type="number" min="0" max="100" step="1" value={draft.rule_adherence_score} onChange={(event) => update("rule_adherence_score", event.target.value)} /></label>
        <fieldset className="rule-violation-fieldset"><legend>Rule Violations <small>(optional)</small></legend><div className="quick-violation-grid">{RULE_VIOLATION_OPTIONS.map((violation) => <label key={violation}><input type="checkbox" checked={draft.rule_violations.includes(violation)} onChange={() => toggleViolation(violation)} />{violation}</label>)}</div></fieldset>
        <label>Review Notes<textarea value={draft.setup_review_notes} onChange={(event) => update("setup_review_notes", event.target.value)} /><small>Record what happened, what you did well, or what should improve.</small></label>
        <ImageUploadField label="Screenshot (optional)" file={draft.screenshotFile} existingUrl={trade.screenshot} disabled={isSaving} status={isSaving && draft.screenshotFile ? "uploading" : undefined} onChange={(file) => update("screenshotFile", file)} />
        {trade.screenshot ? <><button className="quick-screenshot" type="button" aria-expanded={showScreenshot} onClick={() => setShowScreenshot((current) => !current)}><img src={trade.screenshot} alt={`${trade.ticker} screenshot`} /><span>{showScreenshot ? "Hide enlarged screenshot" : "Enlarge screenshot"}</span></button>{showScreenshot ? <img className="quick-screenshot-preview" src={trade.screenshot} alt={`${trade.ticker} screenshot enlarged`} /> : null}</> : null}
      </fieldset>
    </section>
    {message ? <p className={`status-message ${message === "Review saved." || message === "All trades reviewed." ? "success" : "error"}`}>{message}</p> : null}
    <div className="quick-review-actions">
      <Button variant="secondary" disabled={isSaving} onClick={onDetailedReview}>Detailed Review</Button>
      <Button disabled={isSaving} onClick={() => save(false)}>{isSaving ? "Saving review..." : "Save Review"}</Button>
      {onSaveNext ? <Button disabled={isSaving} onClick={() => save(true)}>{isSaving ? "Saving review..." : "Save & Next Trade"}</Button> : null}
    </div>
  </form>;
}

export default QuickReviewForm;
