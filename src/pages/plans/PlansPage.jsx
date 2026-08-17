import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMarketPlan, fetchMarketDays } from "../../lib/marketContextService";
import { getWatchlistForDates } from "../../lib/watchlistService";
import { fetchTrades } from "../../lib/tradeService";
import { buildPlanArchive, filterPlanArchive, removePlanFromArchive } from "../../lib/plansArchive";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

function text(value) { return value || "Unknown"; }

export function PlanWatchlistDetail({ item, onPreview }) {
  const scenario = (side) => <div className={`archive-scenario ${side}`}><h4>{side === "long" ? "Long Plan" : "Short Plan"}</h4>{item[`${side}_scenario_enabled`] == null ? <p className="muted">Historical scenario data unavailable.</p> : item[`${side}_scenario_enabled`] ? <><span><b>Trigger</b>{text(item[`${side}_trigger`])}</span><span><b>Plan</b>{text(item[`${side}_setup`])}</span><span><b>Invalidation</b>{text(item[`${side}_invalidation`])}</span></> : <p className="muted">Not planned.</p>}</div>;
  return <article className="archive-watchlist-plan"><header><h3>{item.ticker}</h3><div className="archive-watchlist-meta"><span className="plan-direction-badge">{item.direction || "Unknown"}</span><span>Weekly: {text(item.weekly_bias)}</span><span>Daily: {text(item.daily_bias)}</span><span>{text(item.relative_strength)}</span><span>Confidence: {text(item.confidence)}</span></div></header><div className="archive-scenario-grid">{scenario("long")}{scenario("short")}</div><p className="archive-bottom-line"><strong>Bottom Line:</strong> {item.bottom_line || item.notes || "No game plan."}</p><section className="archive-chart"><strong>Pre-Market Chart</strong>{item.screenshot ? <button type="button" onClick={() => onPreview?.(item)} aria-label={`Open ${item.ticker} archived chart`}><img src={item.screenshot} alt={`${item.ticker} pre-market chart`} /></button> : <span className="muted">No pre-market chart saved.</span>}</section></article>;
}

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Loading plans...");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", ticker: "", marketCondition: "", completed: "" });
  useEffect(() => { fetchMarketDays().then(async (days) => {
    const [watchlist, trades] = await Promise.all([getWatchlistForDates(days.map((day) => day.trade_date)), fetchTrades()]);
    setPlans(buildPlanArchive(days, watchlist, trades)); setStatus("");
  }).catch(() => setStatus("Plans could not be loaded.")); }, []);
  const filtered = useMemo(() => filterPlanArchive(plans, filters), [plans, filters]);
  const update = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const result = await deleteMarketPlan(deleteTarget.trade_date);
      setPlans((current) => removePlanFromArchive(current, deleteTarget.trade_date));
      setSelected(null); setDeleteTarget(null); setDeleteResult(result);
    } catch (error) {
      setStatus(error.message || "Plan could not be deleted.");
    } finally { setIsDeleting(false); }
  };
  return <div className="page-stack plans-page"><header className="app-header"><p className="eyebrow">Archive</p><h1>Plans</h1><p>Compare each pre-market plan with what happened.</p></header>
    <section className="ui-card plans-filters"><label>Date From<input type="date" value={filters.dateFrom} onChange={(e) => update("dateFrom", e.target.value)} /></label><label>Date To<input type="date" value={filters.dateTo} onChange={(e) => update("dateTo", e.target.value)} /></label><label>Watchlist Ticker<input value={filters.ticker} onChange={(e) => update("ticker", e.target.value)} /></label><label>Market Condition<input value={filters.marketCondition} onChange={(e) => update("marketCondition", e.target.value)} /></label><label>Day Status<select value={filters.completed} onChange={(e) => update("completed", e.target.value)}><option value="">All</option><option value="yes">Complete</option><option value="no">Open</option></select></label></section>
    {status ? <p className="status-message">{status}</p> : null}<div className="plans-list">{filtered.map((plan) => <button className="plan-archive-card" key={plan.trade_date} onClick={() => setSelected(plan)}><strong>{plan.trade_date}</strong><span>{text(plan.market_condition)}</span><span>QQQ W {text(plan.qqq_weekly_bias)} / D {text(plan.qqq_daily_bias)} · SPY W {text(plan.spy_weekly_bias)} / D {text(plan.spy_daily_bias)}</span><span>Watchlist: {plan.watchlist.map((item) => item.ticker).join(", ") || "None"}</span><span>Trades: {plan.summary.tradesTaken} · {plan.summary.netPnl >= 0 ? "+" : ""}${plan.summary.netPnl}</span><span>{plan.trading_day_completed_at ? "Day Complete" : "Open"}</span></button>)}</div>
    {!status && !filtered.length ? <p className="empty-state">{plans.length ? "No plans match these filters." : "No saved plans."}</p> : null}
    {deleteResult ? <p className={`status-message ${deleteResult.screenshotCleanupFailures ? "error" : "success"}`}>Plan deleted. {deleteResult.deletedScreenshots} screenshots removed.{deleteResult.screenshotCleanupFailures ? ` ${deleteResult.screenshotCleanupFailures} screenshot may remain orphaned.` : ""}</p> : null}
    {selected ? <Modal title={`Plan · ${selected.trade_date}`} onClose={() => setSelected(null)} className="plan-detail-modal"><div className="plan-detail-grid"><section><h3>Overall Market Context</h3><p>{text(selected.market_condition)} · {text(selected.expected_trading_day)}</p><p>{selected.event_type || "No event"} {selected.event_name || ""}</p><p>{selected.notes || "No general notes."}</p></section>{["qqq", "spy"].map((symbol) => <section key={symbol}><h3>{symbol.toUpperCase()} Analysis</h3><p>Weekly {text(selected[`${symbol}_weekly_bias`])} · Daily {text(selected[`${symbol}_daily_bias`])}</p><p>{text(selected[`${symbol}_market_environment`])} · Key {selected[`${symbol}_most_important_level`] || "N/A"}</p><p>Bull &gt; {selected[`${symbol}_bull_trigger`] || "N/A"} · Bear &lt; {selected[`${symbol}_bear_trigger`] || "N/A"}</p><p>{selected[`${symbol}_game_plan`] || "No game plan."}</p>{selected[`${symbol}Screenshot`] ? <img src={selected[`${symbol}Screenshot`]} alt={`${symbol} plan`} /> : null}</section>)}</div>
      <section><h3>Plan Performance</h3><p>{selected.summary.tradesTaken} trades · ${selected.summary.netPnl} · {selected.summary.winRate ?? "N/A"}% win rate · {selected.summary.plannedTrades} planned · {selected.summary.unplannedTrades} unplanned · {selected.summary.directionMatches} direction matches · {selected.summary.reviewsComplete} reviews complete</p></section>
      <section><h3>Watchlist</h3>{selected.watchlist.length ? selected.watchlist.map((item) => <PlanWatchlistDetail item={item} key={item.id} onPreview={(entry) => setPreviewScreenshot({ src: entry.screenshot, ticker: entry.ticker })} />) : <p>No watchlist.</p>}</section>
      <section><h3>Linked Trades</h3>{selected.trades.map((trade) => <article className="linked-plan-trade" key={trade.id}><span>{trade.ticker} · {trade.direction} · ${trade.pnl} · {trade.plan_direction_classification || (trade.planned_trade ? "Historical plan match unknown" : "Unplanned")} · {trade.review_status || "Not Reviewed"}</span><Button variant="secondary" onClick={() => navigate(`/journal?review=${trade.id}`)}>View Trade</Button></article>)}</section>
      <section><h3>Daily Debrief</h3><p>{selected.reflection_well || selected.reflection_weakness || selected.reflection_focus ? `${selected.reflection_well || ""} ${selected.reflection_weakness || ""} ${selected.reflection_focus || ""}` : "No debrief saved."}</p></section><div className="plan-detail-actions"><Button variant="danger" onClick={() => setDeleteTarget(selected)}>Delete Plan</Button></div></Modal> : null}
    {deleteTarget ? <Modal title="Delete this pre-market plan?" onClose={() => !isDeleting && setDeleteTarget(null)}><div className="delete-plan-confirmation"><p><strong>{deleteTarget.trade_date}</strong></p><p>This will permanently delete the saved market context and QQQ/SPY plan screenshots for this date.</p><p>Trade records will NOT be deleted. Daily watchlist entries and watchlist screenshots will also be preserved.</p><div className="ui-modal-actions"><Button variant="secondary" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" disabled={isDeleting} onClick={handleDelete}>{isDeleting ? "Deleting plan..." : "Delete Plan"}</Button></div></div></Modal> : null}
    {previewScreenshot ? <div className="screenshot-modal" role="dialog" aria-modal="true" aria-label="Archived chart screenshot preview"><button type="button" className="screenshot-modal-backdrop" onClick={() => setPreviewScreenshot(null)}><span>Close preview</span></button><div className="screenshot-modal-content"><div className="selected-trade-review-header"><h2>{previewScreenshot.ticker} Pre-Market Chart</h2><button type="button" onClick={() => setPreviewScreenshot(null)}>Close</button></div><img src={previewScreenshot.src} alt={`${previewScreenshot.ticker} archived pre-market chart preview`} /></div></div> : null}
  </div>;
}
