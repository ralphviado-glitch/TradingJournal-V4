import { useCallback, useState } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ImageUploadField from "../ui/ImageUploadField";
import Modal from "../ui/Modal";
import {
  calculatePositionPercent,
  EXECUTION_QUALITY_VALUES,
  SETUP_QUALITY_VALUES,
} from "../../lib/tradeManagement";
import {
  BREAK_DIRECTIONS, BREAK_LEVEL_TYPES, DISPLACEMENT_QUALITIES, ENTRY_CONFIRMATIONS,
  ENTRY_TRIGGERS, INDEX_ALIGNMENTS, MARKET_ALIGNMENTS, RETEST_QUALITIES,
  RULE_VIOLATION_OPTIONS, THREE_STATE_FIELDS, deriveRoomFields,
} from "../../lib/breakRetestReview";
import { getTradeReviewCompleteness } from "../../lib/workflow/reviewCompleteness";
import { getAuthoritativePnl } from "../../lib/tradePnl";
import { formatJournalPrice, journalReviewLabel, journalReviewStatus } from "../../lib/journalPresentation";

const formatCurrency = (value) => value == null || !Number.isFinite(Number(value)) ? "N/A" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value));

function TradeActionIcon({ name }) {
  if (name === "view") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>;
}

const classificationFields = [
  ["setup", "Setup", "text"],
  ["grade", "Grade", "select"],
  ["mistakeTags", "Mistakes", "text"],
  ["emotionTags", "Emotions", "text"],
];

const executionFields = [
  ["planned_entry", "Planned Entry"],
  ["planned_stop", "Planned Stop"],
  ["planned_target", "Planned Target"],
  ["planned_risk", "Planned Risk"],
  ["actual_stop", "Actual Stop"],
];

const managementNumberFields = [
  "planned_first_scale_price", "planned_first_scale_percent",
  "planned_runner_target", "planned_runner_percent",
  "first_scale_price", "first_scale_shares", "first_scale_percent",
  "runner_exit_price", "runner_shares", "runner_percent", "execution_score",
];

const breakRetestTextFields = ["break_direction", "break_level_type", "displacement_quality", "retest_quality", "qqq_alignment", "spy_alignment", "market_alignment", "entry_trigger", "entry_confirmation"];
const breakRetestNumberFields = ["break_level_price", "next_level_price", "rule_adherence_score"];

function threeStateDraftValue(value) {
  return value === true ? "true" : value === false ? "false" : "";
}

function ThreeStateSelect({ label, value, onChange, helper }) {
  return <label>{label}<select value={value} onChange={onChange}><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select>{helper ? <small className="field-helper">{helper}</small> : null}</label>;
}

function ControlledSelect({ label, field, draft, options, updateDraft, disabled = false }) {
  return <label>{label}<select disabled={disabled} value={draft[field]} onChange={(event) => updateDraft(field, event.target.value)}><option value="">Unknown</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function createEditDraft(trade) {
  return {
    setup: trade.setup || "Unclassified",
    grade: trade.grade || "",
    mistakeTags: (trade.mistakeTags || []).join(", "),
    emotionTags: (trade.emotionTags || []).join(", "),
    rulesFollowed: trade.rulesFollowed === true ? "true" : trade.rulesFollowed === false ? "false" : "",
    notes: trade.notes || "",
    fees: trade.fees ?? "",
    screenshotFile: null,
    removeScreenshot: false,
    setup_quality: trade.setup_quality || "",
    execution_quality: trade.execution_quality || "",
    management_notes: trade.management_notes || "",
    rule_violations: trade.rule_violations ?? null,
    setup_review_notes: trade.setup_review_notes || "",
    ...executionFields.reduce((fields, [field]) => {
      fields[field] = trade[field] ?? "";
      return fields;
    }, {}),
    ...managementNumberFields.reduce((fields, field) => {
      fields[field] = trade[field] ?? "";
      return fields;
    }, {}),
    ...breakRetestTextFields.reduce((fields, field) => ({ ...fields, [field]: trade[field] || "" }), {}),
    ...breakRetestNumberFields.reduce((fields, field) => ({ ...fields, [field]: trade[field] ?? "" }), {}),
    ...THREE_STATE_FIELDS.reduce((fields, field) => ({ ...fields, [field]: threeStateDraftValue(trade[field]) }), {}),
  };
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getActualRiskPreview(trade, draft) {
  const entry = toNullableNumber(trade.entry_price);
  const stop = toNullableNumber(draft.actual_stop);
  const shares = toNullableNumber(trade.shares);

  if (entry === null || stop === null || shares === null) return "-";

  return `$${(Math.abs(entry - stop) * shares).toFixed(2)}`;
}

function TradeTable({
  trades,
  onDeleteTrade,
  onUpdateTrade,
  onSelectTrade,
  savingTradeId,
  deletingTradeId,
  requestedEditTrade,
  onEditRequestHandled,
}) {
  const [editingTrade, setEditingTrade] = useState(requestedEditTrade || null);
  const [editDraft, setEditDraft] = useState(() => requestedEditTrade ? createEditDraft(requestedEditTrade) : null);

  const closeEditModal = useCallback(() => {
    if (savingTradeId) return;
    setEditingTrade(null);
    setEditDraft(null);
    onEditRequestHandled?.();
  }, [savingTradeId, onEditRequestHandled]);

  const updateDraft = (field, value) => {
    setEditDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "first_scale_shares"
        ? { first_scale_percent: calculatePositionPercent(value, editingTrade.shares) ?? "" }
        : {}),
      ...(field === "runner_shares"
        ? { runner_percent: calculatePositionPercent(value, editingTrade.shares) ?? "" }
        : {}),
      ...(field === "displacement_present" && value !== "true" ? { displacement_quality: "" } : {}),
      ...(field === "retest_present" && value !== "true" ? { retest_quality: "" } : {}),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!editingTrade || !editDraft || savingTradeId === editingTrade.id) return;

    try {
      await onUpdateTrade(editingTrade.id, {
        setup: editDraft.setup,
        grade: editDraft.grade,
        mistakeTags: editDraft.mistakeTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        emotionTags: editDraft.emotionTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        rulesFollowed: editDraft.rulesFollowed,
        notes: editDraft.notes,
        fees: editDraft.fees,
        screenshotFile: editDraft.screenshotFile,
        removeScreenshot: editDraft.removeScreenshot,
        setup_quality: editDraft.setup_quality,
        execution_quality: editDraft.execution_quality,
        management_notes: editDraft.management_notes,
        rule_violations: editDraft.rule_violations,
        setup_review_notes: editDraft.setup_review_notes,
        ...breakRetestTextFields.reduce((fields, field) => ({ ...fields, [field]: editDraft[field] }), {}),
        ...breakRetestNumberFields.reduce((fields, field) => ({ ...fields, [field]: editDraft[field] }), {}),
        ...THREE_STATE_FIELDS.reduce((fields, field) => ({ ...fields, [field]: editDraft[field] }), {}),
        ...managementNumberFields.reduce((fields, field) => {
          fields[field] = editDraft[field];
          return fields;
        }, {}),
        ...executionFields.reduce((fields, [field]) => {
          fields[field] = editDraft[field];
          return fields;
        }, {}),
      });
      setEditingTrade(null);
      setEditDraft(null);
      onEditRequestHandled?.();
    } catch {
      // Parent dashboard displays the actionable error and keeps the modal open.
    }
  };

  const renderResult = (trade) => {
    const pnl = Number(getAuthoritativePnl(trade) || 0);
    if (pnl > 0) return <Badge tone="profit">Win</Badge>;
    if (pnl < 0) return <Badge tone="loss">Loss</Badge>;
    return <Badge tone="warning">Breakeven</Badge>;
  };

  const roomPreview = editingTrade && editDraft ? deriveRoomFields({ ...editingTrade, ...editDraft }) : null;
  const toggleRuleViolation = (violation) => {
    const selected = editDraft.rule_violations || [];
    updateDraft("rule_violations", selected.includes(violation)
      ? selected.filter((item) => item !== violation)
      : [...selected, violation]);
  };

  if (!trades || trades.length === 0) {
    return <p className="empty-state">No trades yet.</p>;
  }

  return (
    <>
      <div className="trade-table-wrapper">
        <table className="trade-table">
          <colgroup><col className="col-date"/><col className="col-ticker"/><col className="col-direction"/><col className="col-result"/><col className="col-number"/><col className="col-number"/><col className="col-shares"/><col className="col-pnl"/><col className="col-setup"/><col className="col-grade"/><col className="col-efficiency"/><col className="col-review"/><col className="col-actions"/></colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Ticker</th>
              <th>Direction</th>
              <th>Result</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Shares</th>
              <th className="numeric">Net P&amp;L</th>
              <th>Setup</th>
              <th>Grade</th>
              <th>Exit Efficiency</th>
              <th>Review</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td title={trade.trade_date || trade.date}>{trade.trade_date || trade.date}</td>
                <td><strong>{trade.ticker}</strong></td>
                <td>{trade.direction || "N/A"}</td>
                <td>{renderResult(trade)}</td>
                <td className="numeric">{formatJournalPrice(trade.entry_price)}</td>
                <td className="numeric">{formatJournalPrice(trade.exit_price)}</td>
                <td>{trade.shares}</td>
                <td className={`numeric ${Number(getAuthoritativePnl(trade) || 0) >= 0 ? "result-win" : "result-loss"}`}>{formatCurrency(getAuthoritativePnl(trade))}</td>
                <td className="truncate-cell" title={trade.setupTags?.map((tag)=>tag.name).join(", ") || trade.setup || "Unclassified"}>{trade.setupTags?.length ? `${trade.setupTags[0].name}${trade.setupTags.length > 1 ? ` +${trade.setupTags.length - 1}` : ""}` : trade.setup || "Unclassified"}</td>
                <td>{trade.final_grade || trade.grade || "-"}</td>
                <td>{trade.exit_efficiency == null ? "-" : `${trade.exit_efficiency}%`}</td>
                <td className="compact-review-status" title={`${journalReviewStatus(trade,getTradeReviewCompleteness(trade).status)}${trade.outcome_classification ? ` · ${trade.outcome_classification}` : ""}`}><Badge tone={["Reviewed","Review Complete"].includes(journalReviewStatus(trade,getTradeReviewCompleteness(trade).status)) ? "profit" : "warning"}>{journalReviewLabel(journalReviewStatus(trade,getTradeReviewCompleteness(trade).status))}</Badge></td>
                <td>
                  <div className="table-actions">
                    <Button className="trade-action-icon" variant="secondary" title={`View ${trade.ticker} trade`} aria-label={`View ${trade.ticker} trade`} onClick={() => onSelectTrade(trade)}><TradeActionIcon name="view" /></Button>
                    <Button className="trade-action-icon"
                      variant="danger"
                      disabled={deletingTradeId === trade.id}
                      title={`Delete ${trade.ticker} trade`}
                      aria-label={`Delete ${trade.ticker} trade`}
                      onClick={() => onDeleteTrade(trade.id)}
                    >
                      <TradeActionIcon name="delete" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="trade-card-list">
        {trades.map((trade) => (
          <article className="trade-card" key={trade.id}>
            <div className="trade-card-header">
              <div>
                <h3>{trade.ticker}</h3>
                <p>{trade.trade_date || trade.date}</p>
              </div>
              {renderResult(trade)}
            </div>
            <div className="trade-card-metrics">
              <p><strong>Direction</strong><span>{trade.direction || "N/A"}</span></p>
              <p><strong>PnL</strong><span>{trade.pnl}</span></p>
              <p><strong>Setup</strong><span>{trade.setupTags?.map((tag)=>tag.name).join(", ") || trade.setup || "Unclassified"}</span></p>
              <p><strong>Grade</strong><span>{trade.final_grade || trade.grade || "-"} · {trade.outcome_classification || "Not graded"}</span></p>
              <p><strong>Review</strong><span>{journalReviewLabel(journalReviewStatus(trade,getTradeReviewCompleteness(trade).status))} · {getTradeReviewCompleteness(trade).percentage}%</span></p>
            </div>
            <div className="watchlist-actions">
              <Button variant="secondary" onClick={() => onSelectTrade(trade)}>Review</Button>
              <Button
                variant="danger"
                isLoading={deletingTradeId === trade.id}
                onClick={() => onDeleteTrade(trade.id)}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      {editingTrade && editDraft ? (
        <Modal title={`Edit ${editingTrade.ticker}`} onClose={closeEditModal} className="trade-edit-modal">
          <form className="trade-edit-form" onSubmit={handleSave}>
            <fieldset disabled={savingTradeId === editingTrade.id}>
              <div className="form-section">
                <h3>Trade Classification</h3>
                <div className="form-grid">
                  {classificationFields.map(([field, label, type]) => (
                    <label key={field}>
                      {label}
                      {type === "select" ? (
                        <select value={editDraft[field]} onChange={(event) => updateDraft(field, event.target.value)}>
                          <option value="">No Grade</option>
                          <option value="A+">A+</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      ) : (
                        <input value={editDraft[field]} onChange={(event) => updateDraft(field, event.target.value)} />
                      )}
                    </label>
                  ))}
                  <label>Rules Followed<select value={editDraft.rulesFollowed} onChange={(event) => updateDraft("rulesFollowed", event.target.value)}><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
                </div>
              </div>

              <div className="form-section">
                <h3>Execution Analysis</h3>
                <div className="imported-execution-grid">
                  <p>
                    <strong>Actual Entry</strong>
                    <span>{editingTrade.entry_price}</span>
                    <small>Imported</small>
                  </p>
                  <p>
                    <strong>Actual Exit</strong>
                    <span>{editingTrade.exit_price}</span>
                    <small>Imported</small>
                  </p>
                  <p>
                    <strong>Actual Risk</strong>
                    <span>{getActualRiskPreview(editingTrade, editDraft)}</span>
                    <small>Calculated from stop</small>
                  </p>
                </div>
                <div className="form-grid">
                  {executionFields.map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input
                        type="number"
                        step="0.01"
                        value={editDraft[field]}
                        onChange={(event) => updateDraft(field, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <div>
                  <h3>Trade Management</h3>
                  <p className="field-helper">Plan the scale-out, then compare it with the actual position management.</p>
                </div>
                <h4>Planned Management</h4>
                <div className="form-grid">
                  <label>Planned First Scale Price<input type="number" min="0" step="0.01" value={editDraft.planned_first_scale_price} onChange={(event) => updateDraft("planned_first_scale_price", event.target.value)} /></label>
                  <label>Planned First Scale %<input type="number" min="0" max="100" step="0.01" value={editDraft.planned_first_scale_percent} onChange={(event) => updateDraft("planned_first_scale_percent", event.target.value)} /></label>
                  <label>Planned Runner Target<input type="number" min="0" step="0.01" value={editDraft.planned_runner_target} onChange={(event) => updateDraft("planned_runner_target", event.target.value)} /></label>
                  <label>Planned Runner %<input type="number" min="0" max="100" step="0.01" value={editDraft.planned_runner_percent} onChange={(event) => updateDraft("planned_runner_percent", event.target.value)} /></label>
                </div>
                <h4>Actual Management</h4>
                {editingTrade.scaleOutSource === "imported_orders" ? <p className="derived-notice">Derived from complete imported order fills. Edit only if broker data needs correction.</p> : null}
                <div className="position-management-grid">
                  <div className="management-card"><strong>Initial Shares</strong><span>{editingTrade.shares}</span></div>
                  <div className="management-card">
                    <strong>First Scale</strong>
                    <label>Price<input type="number" min="0" step="0.01" value={editDraft.first_scale_price} onChange={(event) => updateDraft("first_scale_price", event.target.value)} /></label>
                    <label>Shares<input type="number" min="0" max={editingTrade.shares} step="any" value={editDraft.first_scale_shares} onChange={(event) => updateDraft("first_scale_shares", event.target.value)} /></label>
                    <label>Percent<input type="number" readOnly value={editDraft.first_scale_percent} /></label>
                  </div>
                  <div className="management-card">
                    <strong>Runner</strong>
                    <label>Exit Price<input type="number" min="0" step="0.01" value={editDraft.runner_exit_price} onChange={(event) => updateDraft("runner_exit_price", event.target.value)} /></label>
                    <label>Shares<input type="number" min="0" max={editingTrade.shares} step="any" value={editDraft.runner_shares} onChange={(event) => updateDraft("runner_shares", event.target.value)} /></label>
                    <label>Percent<input type="number" readOnly value={editDraft.runner_percent} /></label>
                  </div>
                </div>
                <label>Management Notes<textarea value={editDraft.management_notes} onChange={(event) => updateDraft("management_notes", event.target.value)} /></label>
              </div>

              <div className="form-section">
                <div>
                  <h3>Quality Review</h3>
                  <p className="field-helper">Rate process independently from P&amp;L—a losing trade can still be well planned and executed.</p>
                </div>
                <div className="form-grid">
                  <label>Setup Quality<select value={editDraft.setup_quality} onChange={(event) => updateDraft("setup_quality", event.target.value)}><option value="">Not Rated</option>{SETUP_QUALITY_VALUES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Execution Quality<select value={editDraft.execution_quality} onChange={(event) => updateDraft("execution_quality", event.target.value)}><option value="">Not Rated</option>{EXECUTION_QUALITY_VALUES.map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label className="execution-score-field">Execution Score (0–100)<input type="number" min="0" max="100" step="1" value={editDraft.execution_score} onChange={(event) => updateDraft("execution_score", event.target.value)} /></label>
                </div>
              </div>

              <div className="form-section break-retest-edit-section">
                <div><h3>Break &amp; Retest Review</h3><p className="field-helper">Record objective setup evidence. These fields do not determine Setup Quality or the trade result.</p></div>

                <div className="break-retest-edit-card"><h4>Setup</h4><div className="form-grid">
                  <ThreeStateSelect label="Break & Retest Setup?" value={editDraft.break_retest_setup} onChange={(event) => updateDraft("break_retest_setup", event.target.value)} />
                  <ControlledSelect label="Direction" field="break_direction" draft={editDraft} options={BREAK_DIRECTIONS} updateDraft={updateDraft} />
                  <ControlledSelect label="Break Level Type" field="break_level_type" draft={editDraft} options={BREAK_LEVEL_TYPES} updateDraft={updateDraft} />
                  <label>Break Level Price<input type="number" min="0" step="0.01" value={editDraft.break_level_price} onChange={(event) => updateDraft("break_level_price", event.target.value)} /></label>
                </div></div>

                <div className="break-retest-edit-card"><h4>Break Quality</h4><div className="form-grid">
                  <ThreeStateSelect label="Displacement Present?" value={editDraft.displacement_present} onChange={(event) => updateDraft("displacement_present", event.target.value)} helper="Strong means a decisive break with expansion and limited immediate rejection." />
                  <ControlledSelect label="Displacement Quality" field="displacement_quality" draft={editDraft} options={DISPLACEMENT_QUALITIES} updateDraft={updateDraft} disabled={editDraft.displacement_present !== "true"} />
                  <ThreeStateSelect label="Volume Confirmation?" value={editDraft.volume_confirmation} onChange={(event) => updateDraft("volume_confirmation", event.target.value)} />
                </div></div>

                <div className="break-retest-edit-card"><h4>Retest</h4><div className="form-grid">
                  <ThreeStateSelect label="Retest Present?" value={editDraft.retest_present} onChange={(event) => updateDraft("retest_present", event.target.value)} helper="Clean means the level was clearly defended or rejected with confirmation." />
                  <ControlledSelect label="Retest Quality" field="retest_quality" draft={editDraft} options={RETEST_QUALITIES} updateDraft={updateDraft} disabled={editDraft.retest_present !== "true"} />
                </div></div>

                <div className="break-retest-edit-card"><h4>Market Alignment</h4><div className="form-grid">
                  <ControlledSelect label="QQQ" field="qqq_alignment" draft={editDraft} options={INDEX_ALIGNMENTS} updateDraft={updateDraft} />
                  <ControlledSelect label="SPY" field="spy_alignment" draft={editDraft} options={INDEX_ALIGNMENTS} updateDraft={updateDraft} />
                  <ControlledSelect label="Overall Market Alignment" field="market_alignment" draft={editDraft} options={MARKET_ALIGNMENTS} updateDraft={updateDraft} />
                </div></div>

                <div className="break-retest-edit-card"><h4>Location</h4><div className="form-grid">
                  <ThreeStateSelect label="Room to Next Level?" value={editDraft.room_to_next_level} onChange={(event) => updateDraft("room_to_next_level", event.target.value)} />
                  <label>Next Level Price<input type="number" min="0" step="0.01" value={editDraft.next_level_price} onChange={(event) => updateDraft("next_level_price", event.target.value)} /></label>
                  <label>Distance to Next Level<input type="number" readOnly value={roomPreview?.distance_to_next_level ?? ""} /></label>
                  <label>Distance in R<input type="number" readOnly value={roomPreview?.distance_to_next_level_r ?? ""} /></label>
                  <ThreeStateSelect label="Extended Before Entry?" value={editDraft.extended_before_entry} onChange={(event) => updateDraft("extended_before_entry", event.target.value)} helper="Use this when price had already made a significant move before entry." />
                </div></div>

                <div className="break-retest-edit-card"><h4>Opening Context</h4><div className="form-grid">
                  <ThreeStateSelect label="Entered After First 5 Minutes?" value={editDraft.entered_after_first_5min} onChange={(event) => updateDraft("entered_after_first_5min", event.target.value)} />
                  <ThreeStateSelect label="First 5-Min Break?" value={editDraft.first_5min_break} onChange={(event) => updateDraft("first_5min_break", event.target.value)} />
                </div></div>

                <div className="break-retest-edit-card"><h4>Entry</h4><div className="form-grid">
                  <ControlledSelect label="Entry Trigger" field="entry_trigger" draft={editDraft} options={ENTRY_TRIGGERS} updateDraft={updateDraft} />
                  <ControlledSelect label="Entry Confirmation" field="entry_confirmation" draft={editDraft} options={ENTRY_CONFIRMATIONS} updateDraft={updateDraft} />
                </div></div>

                <div className="break-retest-edit-card"><h4>Rule Review</h4>
                  <label>Rule Adherence Score (0–100)<input type="number" min="0" max="100" step="1" value={editDraft.rule_adherence_score} onChange={(event) => updateDraft("rule_adherence_score", event.target.value)} /></label>
                  <fieldset className="rule-violation-fieldset"><legend>Rule Violations</legend><div className="rule-violation-grid">{RULE_VIOLATION_OPTIONS.map((violation) => <label className="rule-violation-option" key={violation}><input type="checkbox" checked={(editDraft.rule_violations || []).includes(violation)} onChange={() => toggleRuleViolation(violation)} />{violation}</label>)}</div></fieldset>
                  <label>Setup Review Notes<textarea value={editDraft.setup_review_notes} onChange={(event) => updateDraft("setup_review_notes", event.target.value)} /></label>
                </div>
              </div>

              <div className="form-section">
                <h3>Screenshot</h3>
                <ImageUploadField label="Trade Screenshot" file={editDraft.screenshotFile} existingUrl={editDraft.removeScreenshot ? null : editingTrade.screenshot} disabled={savingTradeId === editingTrade.id} status={savingTradeId === editingTrade.id && editDraft.screenshotFile ? "uploading" : undefined} onChange={(file) => { updateDraft("screenshotFile", file); updateDraft("removeScreenshot", false); }} onRemove={editingTrade.screenshot ? () => { updateDraft("removeScreenshot", true); updateDraft("screenshotFile", null); } : undefined} />
              </div>

              <div className="form-section">
                <h3>Notes</h3>
                <label>Broker Fee (optional)<input type="number" min="0" step="0.01" value={editDraft.fees} onChange={(event) => updateDraft("fees", event.target.value)} placeholder="N/A" /></label>
                <label>
                  Notes
                  <textarea value={editDraft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
                </label>
              </div>

              <div className="modal-actions">
                <Button type="submit" isLoading={savingTradeId === editingTrade.id}>
                  Save Trade
                </Button>
                <Button variant="secondary" disabled={savingTradeId === editingTrade.id} onClick={closeEditModal}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export default TradeTable;
