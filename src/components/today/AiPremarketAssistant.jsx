import { useState } from "react";
import { AI_CONFIDENCE_OPTIONS, AI_DIRECTION_OPTIONS, approveAiPremarketPlan, isAiDraftStale, normalizeAiTickers } from "../../lib/aiPremarketPlan";
import { buildChatGPTPackage, extractChatGPTJson, getPlanDateMismatchMessage, preparePremarketData, validateAndMapChatGPTPlan } from "../../lib/chatgptPremarketPlan";
import Modal from "../ui/Modal";

function updateAt(items, index, field, value) { return items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item); }
function Field({ label, value, onChange, area = false }) { const Tag = area ? "textarea" : "input"; return <label>{label}<Tag rows={area ? 2 : undefined} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>; }
export function BatchApprovalSummary({ draftTickers, existingTickers = [], showExisting = false }) { return <section className="batch-approval-summary"><p><strong>Draft tickers:</strong> {draftTickers.join(", ") || "None"}</p>{showExisting ? <><p><strong>Existing tickers:</strong> {existingTickers.join(", ") || "None"}</p><p>After approval, existing tickers not included in this draft will remain in the watchlist.</p></> : null}</section>; }
export function BatchMergeConfirmation({ draftTickers, isSaving, onCancel, onApprove }) { return <div className="batch-merge-confirmation"><p>This approval will update the market analysis for QQQ/SPY and add or update:</p><strong>{draftTickers.join(", ") || "No watchlist tickers"}</strong><p>Existing watchlist tickers not included in this draft will be preserved.</p><p>Existing manual PMH/PML, event information, unrelated watchlist rows, and linked trades will also be preserved.</p><div className="ai-draft-actions"><button type="button" onClick={onCancel} disabled={isSaving}>Cancel</button><button type="button" onClick={onApprove} disabled={isSaving}>{isSaving ? "Merging..." : "Approve & Merge"}</button></div></div>; }

export default function AiPremarketAssistant({ tradeDate, watchlist, hasExistingPlan, onApproved }) {
  const [tickerText, setTickerText] = useState(() => watchlist.map((item) => item.ticker).join(" "));
  const [draft, setDraft] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "Ready" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);

  async function prepare() {
    if (isGenerating) return;
    setIsGenerating(true); setStatus({ type: "loading", message: "Fetching market data..." });
    try { const result = await preparePremarketData({ tradeDate, tickers: tickerText }); setSnapshot(result); setTickerText(result.metadata.tickersAnalyzed.filter((ticker) => !["QQQ", "SPY"].includes(ticker)).join(" ")); setStatus({ type: "success", message: "Market Data Ready" }); }
    catch (error) { setStatus({ type: "error", message: error.message || "Market data preparation failed" }); }
    finally { setIsGenerating(false); }
  }

  async function copyPackage() {
    const text = buildChatGPTPackage(snapshot);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); const copied = document.execCommand("copy"); area.remove(); if (!copied) throw new Error(); }
      setStatus({ type: "success", message: "Copied to clipboard" });
    } catch { setStatus({ type: "error", message: "Clipboard access failed. Open View Data Package and copy it manually." }); }
  }

  function loadDraft() {
    try {
      const plan = extractChatGPTJson(importText);
      const mapped = validateAndMapChatGPTPlan(plan, snapshot);
      const mismatch = getPlanDateMismatchMessage(plan.tradeDate, tradeDate);
      if (mismatch && !window.confirm(`${mismatch}\n\nLoad it into the currently selected date anyway?`)) return;
      setDraft(mapped); setImportOpen(false); setImportText(""); setStatus({ type: "success", message: "Draft ready" });
    } catch (error) { setStatus({ type: "error", message: error.message || "Invalid ChatGPT plan." }); }
  }

  async function performApproval() {
    setIsSaving(true); setStatus({ type: "loading", message: "Approving plan..." });
    try { await approveAiPremarketPlan(draft, tradeDate); await onApproved(); setMergeConfirmOpen(false); setDraft(null); setStatus({ type: "success", message: hasExistingPlan ? "Merged successfully." : "Approved successfully." }); }
    catch (error) { setStatus({ type: "error", message: error.message || "Approval failed." }); }
    finally { setIsSaving(false); }
  }

  function approve() { if (hasExistingPlan) setMergeConfirmOpen(true); else performApproval(); }

  let tickerError = "";
  try { normalizeAiTickers(tickerText); } catch (error) { tickerError = error.message; }
  return <section className="ai-premarket-assistant">
    <div className="ai-assistant-heading"><div><p className="eyebrow">ChatGPT Pre-Market Assistant</p><h3>Prepare, copy, import, review</h3><small>Prepares higher-timeframe and prior-session data for ChatGPT. No OpenAI API call is made by the app.</small></div><span className={`status-message ${status.type}`}>{status.message}</span></div>
    <div className="ai-ticker-controls"><Field label="Tickers (QQQ and SPY are automatic)" value={tickerText} onChange={(value) => setTickerText(value.toUpperCase())} /><button type="button" onClick={prepare} disabled={isGenerating || Boolean(tickerError)}>{isGenerating ? "Preparing..." : snapshot ? "Refresh Market Data" : "Prepare Market Data"}</button></div>
    {tickerError ? <p className="status-message error">{tickerError}</p> : null}
    {snapshot ? <section className="chatgpt-package-ready"><div><strong>Market Data Ready</strong><p>Data as of {new Date(snapshot.metadata.dataAsOf).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}</p><p>{snapshot.metadata.tickersAnalyzed.join(", ")}</p></div><div className="ai-draft-actions"><button type="button" onClick={copyPackage}>Copy for ChatGPT</button><button type="button" onClick={() => setImportOpen(true)}>Import ChatGPT Plan</button></div><details><summary>View Data Package</summary><textarea className="chatgpt-package-preview" readOnly value={buildChatGPTPackage(snapshot)} /></details></section> : <button type="button" className="chatgpt-import-button" onClick={() => setImportOpen(true)}>Import ChatGPT Plan</button>}
    {importOpen ? <section className="chatgpt-import-card"><h4>Import ChatGPT Plan</h4><label>Paste Trading Journal JSON<textarea rows="12" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste only the TRADING_JOURNAL_JSON returned by ChatGPT." /></label><p className="ai-draft-helper">Raw JSON, one JSON code block, or a readable report containing one JSON code block is accepted.</p><div className="ai-draft-actions"><button type="button" onClick={loadDraft}>Load Draft</button><button type="button" onClick={() => { setImportOpen(false); setImportText(""); }}>Cancel</button></div></section> : null}
    {draft ? <div className="ai-draft-review">
      <div className="ai-draft-banner"><strong>CHATGPT STRUCTURAL DRAFT — NOT YET APPROVED — PREMARKET LEVELS NOT INCLUDED</strong><span>Imported {new Date(draft.metadata.generatedAt).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}<br />Data as of {new Date(draft.metadata.dataAsOf).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}</span></div>
      <p className="ai-draft-helper">Add PMH/PML and any fresh premarket levels manually before the session.</p>
      {isAiDraftStale(draft.metadata.dataAsOf) ? <p className="status-message warning">Market data is more than 30 minutes old. Consider preparing a fresh package before approval.</p> : null}
      {draft.warnings?.length ? <ul className="ai-draft-warnings">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
      <BatchApprovalSummary draftTickers={draft.watchlist.map((item) => item.ticker)} existingTickers={watchlist.map((item) => item.ticker)} showExisting={hasExistingPlan} />
      <section className="ai-draft-card"><h4>Overall Market</h4><div className="ai-draft-grid"><Field label="Market Condition" value={draft.overall.marketCondition} onChange={(value) => setDraft((current) => ({ ...current, overall: { ...current.overall, marketCondition: value } }))} /><Field label="Expected Trading Day" value={draft.overall.expectedTradingDay} onChange={(value) => setDraft((current) => ({ ...current, overall: { ...current.overall, expectedTradingDay: value } }))} /></div><Field area label="General Market Notes" value={draft.overall.notes} onChange={(value) => setDraft((current) => ({ ...current, overall: { ...current.overall, notes: value } }))} /></section>
      {draft.indexes.map((item, index) => <section className="ai-draft-card" key={item.ticker}><h4>{item.ticker}</h4><div className="ai-draft-grid"><Field label="Weekly Bias" value={item.weeklyBias} onChange={(value) => setDraft((current) => ({ ...current, indexes: updateAt(current.indexes, index, "weeklyBias", value) }))} /><Field label="Daily Bias" value={item.dailyBias} onChange={(value) => setDraft((current) => ({ ...current, indexes: updateAt(current.indexes, index, "dailyBias", value) }))} /><Field label="Environment" value={item.marketEnvironment} onChange={(value) => setDraft((current) => ({ ...current, indexes: updateAt(current.indexes, index, "marketEnvironment", value) }))} /></div><p className="ai-deterministic-levels">Prior regular session: PDH {item.levels.pdh ?? "Unavailable"} · PDL {item.levels.pdl ?? "Unavailable"}</p><Field area label="Game Plan / Bottom Line" value={item.gamePlan} onChange={(value) => setDraft((current) => ({ ...current, indexes: updateAt(current.indexes, index, "gamePlan", value) }))} /></section>)}
      {draft.watchlist.map((item, index) => <section className="ai-draft-card" key={item.ticker}><h4>{item.ticker}{item.dataAvailable === false ? " — Data unavailable" : ""}</h4>{item.dataAvailable !== false ? <><div className="ai-draft-grid"><Field label="Weekly Bias" value={item.weeklyBias} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "weeklyBias", value) }))} /><Field label="Daily Bias" value={item.dailyBias} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "dailyBias", value) }))} /><Field label="RS / RW" value={item.relativeStrength} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "relativeStrength", value) }))} /><label>Preferred Direction<select value={item.preferredDirection} onChange={(event) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "preferredDirection", event.target.value) }))}>{AI_DIRECTION_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label><label>Confidence<select value={item.confidence} onChange={(event) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "confidence", event.target.value) }))}>{AI_CONFIDENCE_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      {["long", "short"].map((side) => <div className={`ai-scenario ${side}`} key={side}><label><input type="checkbox" checked={item[`${side}ScenarioEnabled`]} onChange={(event) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, `${side}ScenarioEnabled`, event.target.checked) }))} /> {side.toUpperCase()} Scenario</label><Field area label="Plan" value={item[`${side}Plan`]} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, `${side}Plan`, value) }))} /><div className="ai-draft-grid"><Field label="Trigger" value={item[`${side}Trigger`]} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, `${side}Trigger`, value) }))} /><Field label="Invalidation" value={item[`${side}Invalidation`]} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, `${side}Invalidation`, value) }))} /></div></div>)}<Field area label="Bottom Line" value={item.bottomLine} onChange={(value) => setDraft((current) => ({ ...current, watchlist: updateAt(current.watchlist, index, "bottomLine", value) }))} /></> : <p>{item.bottomLine}</p>}</section>)}
      <div className="ai-draft-actions"><button type="button" onClick={approve} disabled={isSaving}>{isSaving ? "Saving..." : hasExistingPlan ? "Approve & Merge" : "Approve & Save"}</button><button type="button" onClick={() => { setDraft(null); prepare(); }} disabled={isGenerating || isSaving}>Prepare Fresh Package</button><button type="button" onClick={() => { setDraft(null); setStatus({ type: "idle", message: "Ready" }); }} disabled={isSaving}>Cancel Draft</button></div>
    </div> : null}
    {!draft && ["Approved successfully.", "Merged successfully."].includes(status.message) ? <div className="ai-post-approval"><strong>Before market open:</strong><ul><li>□ Add QQQ PMH/PML</li><li>□ Add SPY PMH/PML</li><li>□ Add stock-specific premarket levels if needed</li><li>□ Check major scheduled news/events</li></ul></div> : null}
    {mergeConfirmOpen ? <Modal title="Existing Pre-Market Plan Detected" onClose={() => { if (!isSaving) setMergeConfirmOpen(false); }} className="batch-merge-modal"><BatchMergeConfirmation draftTickers={draft.watchlist.map((item) => item.ticker)} isSaving={isSaving} onCancel={() => setMergeConfirmOpen(false)} onApprove={performApproval} /></Modal> : null}
  </section>;
}
