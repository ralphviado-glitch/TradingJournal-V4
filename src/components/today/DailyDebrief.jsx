import { useMemo, useState } from "react";
import Button from "../ui/Button";
import { buildDailyDebrief } from "../../lib/workflow/dailyDebrief";
import { getDailyCompletion } from "../../lib/workflow/dailyCompletion";

function value(metric, suffix = "") {
  return metric === null || metric === undefined ? "N/A" : `${metric}${suffix}`;
}

function listDistribution(distribution) {
  return Object.entries(distribution).map(([label, count]) => `${label}: ${count}`).join(" · ");
}

function DailyDebrief({ date, trades, marketDay, onSave, onReview, isSaving }) {
  const metrics = useMemo(() => buildDailyDebrief(trades), [trades]);
  const completion = useMemo(() => getDailyCompletion(trades), [trades]);
  const [draft, setDraft] = useState({
    reflection_well: marketDay.reflection_well || "",
    reflection_weakness: marketDay.reflection_weakness || "",
    reflection_focus: marketDay.reflection_focus || "",
    reflection_notes: marketDay.reflection_notes || "",
  });
  const [saveStatus, setSaveStatus] = useState({ type: "idle", message: "" });
  const update = (field, text) => setDraft((current) => ({ ...current, [field]: text }));
  const reflectionsComplete = draft.reflection_well.trim() && draft.reflection_weakness.trim() && draft.reflection_focus.trim();
  const completed = Boolean(marketDay.trading_day_completed_at);
  const save = async (completeDay) => {
    setSaveStatus({ type: "loading", message: completeDay ? "Completing trading day..." : "Saving reflection..." });
    try {
      await onSave(draft, completeDay);
      setSaveStatus({ type: "success", message: completeDay ? "Trading day complete." : "Reflection saved." });
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message || "Daily debrief could not be saved." });
    }
  };

  if (!trades.length) return <section className="today-card daily-debrief"><h2>Daily Debrief</h2><p className="empty-state">No daily debrief required.</p></section>;

  return <section className="today-card daily-debrief" aria-labelledby="daily-debrief-heading">
    <div className="section-header"><div><p className="eyebrow">Post-Market</p><h2 id="daily-debrief-heading">{completed ? "Trading Day Complete" : "Daily Debrief"}</h2><p>{date}</p></div><strong>{completion.reviewComplete} / {completion.totalTrades} reviewed</strong></div>
    <progress max={completion.totalTrades} value={completion.reviewComplete}>{completion.reviewComplete} of {completion.totalTrades}</progress>
    {completion.reviewPending ? <div className="status-message loading"><p>{completion.reviewPending} trade{completion.reviewPending === 1 ? "" : "s"} still require review.</p><Button onClick={() => onReview?.()}>Review Remaining Trades</Button></div> : null}

    <div className="debrief-metric-grid">
      <p><small>Total Trades</small><strong>{metrics.totalTrades}</strong></p><p><small>Wins / Losses / BE</small><strong>{metrics.wins} / {metrics.losses} / {metrics.breakeven}</strong></p>
      <p><small>Net P&amp;L</small><strong>{value(metrics.netPnl)}</strong></p><p><small>Win Rate</small><strong>{value(metrics.winRate, "%")}</strong></p>
      <p><small>Average MFE / MAE</small><strong>{value(metrics.averageMfe)} / {value(metrics.averageMae)}</strong></p><p><small>Average MFE R / MAE R</small><strong>{value(metrics.averageMfeR, "R")} / {value(metrics.averageMaeR, "R")}</strong></p>
      <p><small>Exit Efficiency</small><strong>{value(metrics.averageExitEfficiency, "%")}</strong></p><p><small>Rule Adherence</small><strong>{value(metrics.averageRuleAdherence, "%")}</strong></p>
      <p><small>Execution Score</small><strong>{value(metrics.averageExecutionScore)}</strong></p><p><small>Good Process</small><strong>{value(metrics.goodProcessPercentage, "%")}</strong></p>
      <p><small>Review Completion</small><strong>{value(metrics.reviewCompletionPercentage, "%")}</strong></p>
    </div>

    <div className="debrief-process-grid">
      <p><strong>Setup Quality</strong><span>{listDistribution(metrics.setupQualityDistribution)}</span></p>
      <p><strong>Execution Quality</strong><span>{listDistribution(metrics.executionQualityDistribution)}</span></p>
      <p><strong>Break &amp; Retest Trades</strong><span>{metrics.breakRetestTrades}</span></p>
      <p><strong>Watchlist / Direction Matches</strong><span>{metrics.watchlistMatches} / {metrics.directionMatches}</span></p>
      <p><strong>Most Frequent Rule Violation</strong><span>{metrics.mostFrequentRuleViolation || "None recorded"}</span></p>
      <p><strong>Best Process Trade</strong><span>{metrics.bestProcessTrade ? `${metrics.bestProcessTrade.ticker} · ${metrics.bestProcessTrade.entry_time || ""}` : "N/A"}</span></p>
      <p><strong>Trade Needing Most Review</strong><span>{metrics.tradeNeedingMostReview ? `${metrics.tradeNeedingMostReview.ticker} · ${metrics.tradeNeedingMostReview.entry_time || ""}` : "N/A"}</span></p>
    </div>

    <form className="debrief-reflection" onSubmit={(event) => { event.preventDefault(); save(false); }}>
      <fieldset disabled={isSaving}>
        <label>What did I do well today?<textarea value={draft.reflection_well} onChange={(event) => update("reflection_well", event.target.value)} /></label>
        <label>What was my biggest execution mistake or weakness?<textarea value={draft.reflection_weakness} onChange={(event) => update("reflection_weakness", event.target.value)} /></label>
        <label>What is the ONE thing I will focus on next session?<textarea value={draft.reflection_focus} onChange={(event) => update("reflection_focus", event.target.value)} /></label>
        <label>General Session Notes <small>(optional)</small><textarea value={draft.reflection_notes} onChange={(event) => update("reflection_notes", event.target.value)} /></label>
      </fieldset>
      {saveStatus.message ? <p className={`status-message ${saveStatus.type}`}>{saveStatus.message}</p> : null}
      <div className="debrief-actions"><Button variant="secondary" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Reflection"}</Button><Button disabled={isSaving || completion.reviewPending > 0 || !reflectionsComplete} onClick={() => save(true)}>{completed ? "Update Completed Day" : "Complete Trading Day"}</Button></div>
    </form>
  </section>;
}

export default DailyDebrief;
