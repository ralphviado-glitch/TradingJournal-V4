import { useEffect, useMemo, useState } from "react";
import { fetchMarketDayForDate, upsertMarketDay } from "../../lib/marketContextService";
import {
  createWatchlistItem,
  deleteWatchlistItem,
  getWatchlistForDate,
  updateWatchlistItem,
} from "../../lib/watchlistService";
import { DEFAULT_RISK_CONTROLS, calculatePositionSize } from "../../lib/risk";
import { getAvailableWatchlistLevels, sortWatchlistByPriority } from "../../lib/watchlistUtils";
import { fetchTrades } from "../../lib/tradeService";
import DailyCompletion from "../../components/today/DailyCompletion";
import DailyDebrief from "../../components/today/DailyDebrief";
import { useNavigate } from "react-router-dom";
import { getNewYorkTradingDate } from "../../lib/marketTime";
import { buildReviewQueue } from "../../lib/workflow/reviewCompleteness";
import PreMarketContextForm from "../../components/today/PreMarketContextForm";
import ImageUploadField from "../../components/ui/ImageUploadField";

const directionOptions = ["Long", "Short", "Both", "Neutral"];
const structuredLevelInputs = [
  ["pmh", "PMH"],
  ["pml", "PML"],
  ["pdh", "PDH"],
  ["pdl", "PDL"],
  ["ath", "ATH"],
  ["major_support", "Major Support"],
  ["major_resistance", "Major Resistance"],
];
const ruleDefaults = [
  "Wait for the first 5-minute candle to close.",
  "Trade only meaningful levels.",
  "Require displacement.",
  "Wait for a confirmed retest.",
  "Check room to the next liquidity level.",
  "QQQ/SPY must not strongly oppose the trade.",
  "Do not chase.",
  "Do not anticipate.",
];

function getTodayDate() {
  return getNewYorkTradingDate();
}

function createEmptyMarketContext(tradeDate) {
  return {
    trade_date: tradeDate,
    market_condition: "",
    qqq_bias: "",
    qqq_pdh: "",
    qqq_pdl: "",
    qqq_pmh: "",
    qqq_pml: "",
    qqq_liquidity_target: "",
    spy_bias: "",
    spy_pdh: "",
    spy_pdl: "",
    spy_pmh: "",
    spy_pml: "",
    spy_liquidity_target: "",
    event_type: "",
    event_name: "",
    notes: "",
    reflection_well: "",
    reflection_weakness: "",
    reflection_focus: "",
    reflection_notes: "",
    trading_day_completed_at: null,
  };
}

function createEmptyWatchlistItem(tradeDate, priority) {
  return {
    trade_date: tradeDate,
    ticker: "",
    direction: "Neutral",
    priority,
    setup: "",
    atr: "",
    pmh: "",
    pml: "",
    pdh: "",
    pdl: "",
    ath: "",
    major_support: "",
    major_resistance: "",
    key_levels: "",
    notes: "",
    overall_rating: "",
    weekly_bias: "",
    intraday_bias: "",
    relative_strength: "",
    confidence: "",
    long_scenario_enabled: false,
    long_trigger: "",
    long_setup: "",
    long_target: "",
    long_invalidation: "",
    short_scenario_enabled: false,
    short_trigger: "",
    short_setup: "",
    short_target: "",
    short_invalidation: "",
    bottom_line: "",
  };
}

const scenarioFields = ["long_scenario_enabled", "long_trigger", "long_setup", "long_target", "long_invalidation", "short_scenario_enabled", "short_trigger", "short_setup", "short_target", "short_invalidation"];
const contextFields = ["overall_rating", "weekly_bias", "intraday_bias", "relative_strength", "confidence", "bottom_line"];

export function WatchlistPlanEditor({ draft, onChange }) {
  const scenario = (side) => {
    const enabled = draft[`${side}_scenario_enabled`] === true;
    return <section className={`watchlist-scenario-editor ${side}`}><label className="scenario-toggle"><input type="checkbox" checked={enabled} onChange={(event) => onChange(`${side}_scenario_enabled`, event.target.checked)} /><strong>{side.toUpperCase()} Scenario</strong></label>{enabled ? <div className="scenario-fields"><label>Trigger<input value={draft[`${side}_trigger`] || ""} onChange={(event) => onChange(`${side}_trigger`, event.target.value)} /></label><label>Entry / Setup<input value={draft[`${side}_setup`] || ""} onChange={(event) => onChange(`${side}_setup`, event.target.value)} /></label><label>Target<input value={draft[`${side}_target`] || ""} onChange={(event) => onChange(`${side}_target`, event.target.value)} /></label><label>Invalidation<input value={draft[`${side}_invalidation`] || ""} onChange={(event) => onChange(`${side}_invalidation`, event.target.value)} /></label></div> : <p className="field-helper">Not currently planned. Saved values are retained.</p>}</section>;
  };
  return <>
    <h3>Stock Context</h3><div className="watchlist-editor-grid compact"><label>Ticker<input required value={draft.ticker} onChange={(event) => onChange("ticker", event.target.value)} /></label><label>Rating<input value={draft.overall_rating || ""} onChange={(event) => onChange("overall_rating", event.target.value)} /></label><label>Weekly Bias<input value={draft.weekly_bias || ""} onChange={(event) => onChange("weekly_bias", event.target.value)} /></label><label>Intraday Bias<input value={draft.intraday_bias || ""} onChange={(event) => onChange("intraday_bias", event.target.value)} /></label><label>Relative Strength / Weakness<input value={draft.relative_strength || ""} onChange={(event) => onChange("relative_strength", event.target.value)} /></label><label>Preferred Direction<select value={draft.direction} onChange={(event) => onChange("direction", event.target.value)}>{directionOptions.map((direction) => <option key={direction}>{direction}</option>)}</select></label><label>Confidence<input value={draft.confidence || ""} onChange={(event) => onChange("confidence", event.target.value)} /></label><label>Priority<input type="number" min="1" value={draft.priority} onChange={(event) => onChange("priority", event.target.value)} /></label></div>
    <div className="watchlist-scenario-grid">{scenario("long")}{scenario("short")}</div>
    <label className="watchlist-bottom-line">Bottom Line / Game Plan<textarea rows="2" value={draft.bottom_line || ""} onChange={(event) => onChange("bottom_line", event.target.value)} /></label>
  </>;
}

export function WatchlistPlanCard({ item }) {
  const scenario = (side) => item[`${side}_scenario_enabled`] ? <div className={`watchlist-scenario-summary ${side}`}><strong>{side.toUpperCase()}</strong><span>{[item[`${side}_trigger`], item[`${side}_setup`], item[`${side}_target`] && `→ ${item[`${side}_target`]}`].filter(Boolean).join(" · ") || "Scenario planned"}</span>{item[`${side}_invalidation`] ? <small>Invalidation: {item[`${side}_invalidation`]}</small> : null}</div> : null;
  return <div className="watchlist-live-plan"><p>{item.intraday_bias || item.setup || "No intraday bias"}{item.relative_strength ? ` · ${item.relative_strength}` : ""}</p><strong>Prefer {String(item.direction || "Neutral").toUpperCase()}{item.confidence ? ` · ${item.confidence} Confidence` : ""}</strong>{scenario("long")}{scenario("short")}<p className="watchlist-bottom-line-summary"><strong>Bottom Line:</strong> {item.bottom_line || item.notes || "No game plan."}</p></div>;
}

function getPriorityClass(priority) {
  const number = Number(priority || 0);

  if (number === 1) return "priority-one";
  if (number === 2) return "priority-two";
  return "priority-three";
}

function TodayPage() {
  const navigate = useNavigate();
  const today = useMemo(() => getTodayDate(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [marketContext, setMarketContext] = useState(createEmptyMarketContext(today));
  const [qqqScreenshotFile, setQQQScreenshotFile] = useState(null);
  const [spyScreenshotFile, setSPYScreenshotFile] = useState(null);
  const [marketStatus, setMarketStatus] = useState({ type: "loading", message: "Loading market context..." });
  const [isSavingMarket, setIsSavingMarket] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistStatus, setWatchlistStatus] = useState({
    type: "loading",
    message: "Loading watchlist...",
  });
  const [newWatchlistItem, setNewWatchlistItem] = useState(createEmptyWatchlistItem(today, 1));
  const [editingWatchlistId, setEditingWatchlistId] = useState(null);
  const [editingWatchlistItem, setEditingWatchlistItem] = useState(null);
  const [newWatchlistScreenshotFile, setNewWatchlistScreenshotFile] = useState(null);
  const [editingWatchlistScreenshotFile, setEditingWatchlistScreenshotFile] = useState(null);
  const [removeEditingScreenshot, setRemoveEditingScreenshot] = useState(false);
  const [previewScreenshot, setPreviewScreenshot] = useState(null);
  const [savingWatchlistId, setSavingWatchlistId] = useState(null);
  const [riskControls, setRiskControls] = useState(DEFAULT_RISK_CONTROLS);
  const [calculator, setCalculator] = useState({
    direction: "Long",
    entryPrice: "",
    stopPrice: "",
  });
  const [rules, setRules] = useState(ruleDefaults.map((rule) => ({ rule, checked: false })));
  const [todayTrades, setTodayTrades] = useState([]);
  const [isSavingDebrief, setIsSavingDebrief] = useState(false);

  const positionSize = calculatePositionSize({
    ...calculator,
    ...riskControls,
  });

  useEffect(() => {
    async function loadTodayData() {
      try {
        const [savedMarketContext, savedWatchlist, savedTrades] = await Promise.all([
          fetchMarketDayForDate(selectedDate),
          getWatchlistForDate(selectedDate),
          fetchTrades(),
        ]);

        if (savedMarketContext) {
          setMarketContext({ ...createEmptyMarketContext(selectedDate), ...savedMarketContext });
          setMarketStatus({ type: "success", message: "" });
        } else {
          setMarketContext(createEmptyMarketContext(selectedDate));
          setMarketStatus({ type: "idle", message: "No pre-market plan saved for this date yet." });
        }

        setWatchlist(savedWatchlist);
        setNewWatchlistItem(createEmptyWatchlistItem(selectedDate, savedWatchlist.length + 1));
        setWatchlistStatus({ type: "success", message: "" });
        setTodayTrades(savedTrades.filter((trade) => (trade.trade_date || trade.date) === selectedDate));
      } catch (error) {
        console.error("Failed to load Today workspace:", error);
        setMarketStatus({ type: "error", message: "Failed to load today's market context." });
        setWatchlistStatus({ type: "error", message: "Failed to load today's watchlist." });
      }
    }

    loadTodayData();
  }, [selectedDate]);

  const updateMarketField = (field, value) => {
    if (field === "trade_date") { setSelectedDate(value); return; }
    setMarketContext((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveMarketContext = async (event) => {
    event.preventDefault();
    setIsSavingMarket(true);
    setMarketStatus({ type: "loading", message: "Saving market context..." });

    try {
      const savedMarketContext = await upsertMarketDay({ ...marketContext, qqqScreenshotFile, spyScreenshotFile });
      setMarketContext({ ...createEmptyMarketContext(selectedDate), ...savedMarketContext });
      setQQQScreenshotFile(null); setSPYScreenshotFile(null);
      setMarketStatus({ type: "success", message: "Pre-market plan saved." });
    } catch (error) {
      console.error("Failed to save today's market context:", error);
      setMarketStatus({ type: "error", message: error.message || "Failed to save market context." });
    } finally {
      setIsSavingMarket(false);
    }
  };

  const handleCreateWatchlistItem = async (event) => {
    event.preventDefault();

    if (!newWatchlistItem.ticker.trim()) {
      setWatchlistStatus({ type: "error", message: "Ticker is required." });
      return;
    }

    setSavingWatchlistId("new");
    setWatchlistStatus({ type: "loading", message: "Adding watchlist item..." });

    try {
      const savedItem = await createWatchlistItem({
        ...newWatchlistItem,
        screenshotFile: newWatchlistScreenshotFile,
      });
      const nextWatchlist = sortWatchlistByPriority([...watchlist, savedItem]);
      setWatchlist(nextWatchlist);
      setNewWatchlistItem(createEmptyWatchlistItem(today, nextWatchlist.length + 1));
      setNewWatchlistScreenshotFile(null);
      setWatchlistStatus({ type: "success", message: "Watchlist item added." });
    } catch (error) {
      console.error("Failed to add watchlist item:", error);
      setWatchlistStatus({ type: "error", message: error.message || "Failed to add watchlist item." });
    } finally {
      setSavingWatchlistId(null);
    }
  };

  const handleStartEditingWatchlist = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingWatchlistId(item.id);
    setEditingWatchlistItem({ ...item });
    setEditingWatchlistScreenshotFile(null);
    setRemoveEditingScreenshot(false);
    setWatchlistStatus({ type: "idle", message: "" });
  };

  const handleCancelWatchlistEdit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingWatchlistId(null);
    setEditingWatchlistItem(null);
    setEditingWatchlistScreenshotFile(null);
    setRemoveEditingScreenshot(false);
    setWatchlistStatus({ type: "idle", message: "" });
  };

  const updateEditingWatchlistField = (field, value) => {
    setEditingWatchlistItem((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleUpdateWatchlistItem = async (event, itemId) => {
    event.preventDefault();

    if (savingWatchlistId) return;

    if (!editingWatchlistItem || editingWatchlistId !== itemId) {
      setWatchlistStatus({ type: "error", message: "Choose a watchlist row to edit." });
      return;
    }

    if (!editingWatchlistItem.ticker?.trim()) {
      setWatchlistStatus({ type: "error", message: "Ticker is required." });
      return;
    }

    setSavingWatchlistId(itemId);
    setWatchlistStatus({ type: "loading", message: "Saving watchlist item..." });

    try {
      const savedItem = await updateWatchlistItem(itemId, {
        ticker: editingWatchlistItem.ticker,
        direction: editingWatchlistItem.direction,
        priority: editingWatchlistItem.priority,
        setup: editingWatchlistItem.setup,
        atr: editingWatchlistItem.atr,
        pmh: editingWatchlistItem.pmh,
        pml: editingWatchlistItem.pml,
        pdh: editingWatchlistItem.pdh,
        pdl: editingWatchlistItem.pdl,
        ath: editingWatchlistItem.ath,
        major_support: editingWatchlistItem.major_support,
        major_resistance: editingWatchlistItem.major_resistance,
        key_levels: editingWatchlistItem.key_levels,
        notes: editingWatchlistItem.notes,
        ...Object.fromEntries([...contextFields, ...scenarioFields].map((field) => [field, editingWatchlistItem[field]])),
        screenshotFile: editingWatchlistScreenshotFile,
        removeScreenshot: removeEditingScreenshot,
      });
      setWatchlist((current) =>
        sortWatchlistByPriority(current.map((item) => (item.id === savedItem.id ? savedItem : item)))
      );
      setEditingWatchlistId(null);
      setEditingWatchlistItem(null);
      setEditingWatchlistScreenshotFile(null);
      setRemoveEditingScreenshot(false);
      setWatchlistStatus({ type: "success", message: "Watchlist item saved." });
    } catch (error) {
      console.error("Failed to update watchlist item:", error);
      setWatchlistStatus({ type: "error", message: error.message || "Failed to save watchlist item." });
    } finally {
      setSavingWatchlistId(null);
    }
  };

  const handleDeleteWatchlistItem = async (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = window.confirm("Delete this watchlist item?");

    if (!confirmed) return;

    setSavingWatchlistId(id);
    setWatchlistStatus({ type: "loading", message: "Deleting watchlist item..." });

    try {
      await deleteWatchlistItem(id);
      const nextWatchlist = watchlist.filter((item) => item.id !== id);
      setWatchlist(nextWatchlist);
      setNewWatchlistItem((current) => ({
        ...current,
        priority: nextWatchlist.length + 1,
      }));
      setWatchlistStatus({ type: "success", message: "Watchlist item deleted." });
    } catch (error) {
      console.error("Failed to delete watchlist item:", error);
      setWatchlistStatus({ type: "error", message: error.message || "Failed to delete watchlist item." });
    } finally {
      setSavingWatchlistId(null);
    }
  };

  const updateRiskControl = (field, value) => {
    setRiskControls((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleRule = (index) => {
    setRules((currentRules) =>
      currentRules.map((item, itemIndex) =>
        itemIndex === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleSaveDebrief = async (reflection, completeDay) => {
    setIsSavingDebrief(true);
    try {
      const saved = await upsertMarketDay({
        ...marketContext,
        ...reflection,
        trading_day_completed_at: completeDay
          ? marketContext.trading_day_completed_at || new Date().toISOString()
          : marketContext.trading_day_completed_at,
      });
      setMarketContext((current) => ({ ...current, ...saved }));
    } finally {
      setIsSavingDebrief(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="app-header today-header">
        <p className="eyebrow">Pre-Market</p><h1>Pre-Market Plan</h1>
        <p>{selectedDate}</p>
      </header>

      <main className="today-page">
        <section className="workflow-zone premarket-zone"><div className="zone-heading"><p className="eyebrow">Pre-Market</p><h2>Plan the Session</h2></div>
        {marketStatus.message ? <p className={`status-message ${marketStatus.type}`}>{marketStatus.message}</p> : null}
        <PreMarketContextForm plan={marketContext} update={updateMarketField} onSubmit={handleSaveMarketContext} isSaving={isSavingMarket} setQQQFile={setQQQScreenshotFile} setSPYFile={setSPYScreenshotFile} />
        </section>
        <section className="workflow-zone postmarket-zone"><div className="zone-heading"><p className="eyebrow">Post-Market Review</p><h2>Review the Session</h2></div>
        <DailyCompletion date={selectedDate} trades={todayTrades} onReview={(trade) => navigate(`/journal?review=${trade.id}`)} />
        <DailyDebrief
          key={marketContext.id || "new-debrief"}
          date={selectedDate}
          trades={todayTrades}
          marketDay={marketContext}
          isSaving={isSavingDebrief}
          onSave={handleSaveDebrief}
          onReview={() => { const next = buildReviewQueue(todayTrades)[0]; if (next) navigate(`/journal?review=${next.id}`); }}
        />
        </section>
        <section className="today-card legacy-market-context" hidden>
          <h2>Market Context</h2>
          {marketStatus.message ? (
            <p className={`status-message ${marketStatus.type}`}>{marketStatus.message}</p>
          ) : null}

          <form className="today-form" onSubmit={handleSaveMarketContext}>
            <fieldset disabled={isSavingMarket}>
              <label>
                Trading Date
                <input type="date" value={marketContext.trade_date} readOnly />
              </label>

              <label>
                Market Condition
                <select
                  value={marketContext.market_condition}
                  required
                  onChange={(event) => updateMarketField("market_condition", event.target.value)}
                >
                  <option value="">Select condition</option>
                  <option value="Trending">Trending</option>
                  <option value="Range">Range</option>
                  <option value="Choppy">Choppy</option>
                  <option value="Extended">Extended</option>
                  <option value="Reversal">Reversal</option>
                  <option value="News Driven">News Driven</option>
                  <option value="Low Volume">Low Volume</option>
                </select>
              </label>

              <div className="today-two-column">
                <div>
                  <h3>QQQ</h3>
                  <label>
                    Bias
                    <select
                      value={marketContext.qqq_bias}
                      required
                      onChange={(event) => updateMarketField("qqq_bias", event.target.value)}
                    >
                      <option value="">Select bias</option>
                      <option value="Bullish">Bullish</option>
                      <option value="Bearish">Bearish</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Range">Range</option>
                    </select>
                  </label>
                  <label>PDH<input type="number" step="0.01" value={marketContext.qqq_pdh || ""} onChange={(event) => updateMarketField("qqq_pdh", event.target.value)} /></label>
                  <label>PDL<input type="number" step="0.01" value={marketContext.qqq_pdl || ""} onChange={(event) => updateMarketField("qqq_pdl", event.target.value)} /></label>
                  <label>PMH<input type="number" step="0.01" value={marketContext.qqq_pmh || ""} onChange={(event) => updateMarketField("qqq_pmh", event.target.value)} /></label>
                  <label>PML<input type="number" step="0.01" value={marketContext.qqq_pml || ""} onChange={(event) => updateMarketField("qqq_pml", event.target.value)} /></label>
                  <label>Liquidity Target<input value={marketContext.qqq_liquidity_target || ""} onChange={(event) => updateMarketField("qqq_liquidity_target", event.target.value)} /></label>
                </div>

                <div>
                  <h3>SPY</h3>
                  <label>
                    Bias
                    <select
                      value={marketContext.spy_bias}
                      required
                      onChange={(event) => updateMarketField("spy_bias", event.target.value)}
                    >
                      <option value="">Select bias</option>
                      <option value="Bullish">Bullish</option>
                      <option value="Bearish">Bearish</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Range">Range</option>
                    </select>
                  </label>
                  <label>PDH<input type="number" step="0.01" value={marketContext.spy_pdh || ""} onChange={(event) => updateMarketField("spy_pdh", event.target.value)} /></label>
                  <label>PDL<input type="number" step="0.01" value={marketContext.spy_pdl || ""} onChange={(event) => updateMarketField("spy_pdl", event.target.value)} /></label>
                  <label>PMH<input type="number" step="0.01" value={marketContext.spy_pmh || ""} onChange={(event) => updateMarketField("spy_pmh", event.target.value)} /></label>
                  <label>PML<input type="number" step="0.01" value={marketContext.spy_pml || ""} onChange={(event) => updateMarketField("spy_pml", event.target.value)} /></label>
                  <label>Liquidity Target<input value={marketContext.spy_liquidity_target || ""} onChange={(event) => updateMarketField("spy_liquidity_target", event.target.value)} /></label>
                </div>
              </div>

              <label>
                Event Type
                <select
                  value={marketContext.event_type || ""}
                  onChange={(event) => updateMarketField("event_type", event.target.value)}
                >
                  <option value="">None</option>
                  <option value="CPI">CPI</option>
                  <option value="PPI">PPI</option>
                  <option value="FOMC">FOMC</option>
                  <option value="NFP">NFP</option>
                  <option value="Fed Speaker">Fed Speaker</option>
                  <option value="Earnings">Earnings</option>
                  <option value="OPEX">OPEX</option>
                  <option value="GDP">GDP</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>Event Name<input value={marketContext.event_name || ""} onChange={(event) => updateMarketField("event_name", event.target.value)} /></label>
              <label>Notes<textarea value={marketContext.notes || ""} onChange={(event) => updateMarketField("notes", event.target.value)} /></label>

              <button type="submit">{isSavingMarket ? "Saving..." : "Save Market Context"}</button>
            </fieldset>
          </form>
        </section>

        <section className="today-card watchlist-section">
          <h2>Watchlist</h2>
          {watchlistStatus.message ? (
            <p className={`status-message ${watchlistStatus.type}`}>{watchlistStatus.message}</p>
          ) : null}

          <form className="watchlist-form watchlist-editor" onSubmit={handleCreateWatchlistItem}>
            <fieldset disabled={savingWatchlistId === "new"}>
              <WatchlistPlanEditor draft={newWatchlistItem} onChange={(field, value) => setNewWatchlistItem((current) => ({ ...current, [field]: value }))} />
              <details className="watchlist-secondary-fields"><summary>Levels and chart</summary><div className="watchlist-editor-grid">
                {structuredLevelInputs.map(([field, label]) => <label key={field}>{label}<input type="number" step="0.01" value={newWatchlistItem[field]} onChange={(event) => setNewWatchlistItem((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
                <label>Additional Levels<textarea rows="2" value={newWatchlistItem.key_levels} onChange={(event) => setNewWatchlistItem((current) => ({ ...current, key_levels: event.target.value }))} /></label>
                <ImageUploadField label="Chart Screenshot" file={newWatchlistScreenshotFile} disabled={savingWatchlistId === "new"} status={savingWatchlistId === "new" && newWatchlistScreenshotFile ? "uploading" : undefined} onChange={setNewWatchlistScreenshotFile} />
              </div></details>

              <button type="submit" disabled={savingWatchlistId === "new"}>
                {savingWatchlistId === "new" ? "Adding..." : "Add"}
              </button>
            </fieldset>
          </form>

          {watchlist.length === 0 ? (
            <p className="empty-state">No watchlist items for today.</p>
          ) : (
            <div className="watchlist-list">
              {watchlist.map((item) => {
                const isEditing = editingWatchlistId === item.id;
                const draft = isEditing ? editingWatchlistItem : item;
                const availableLevels = getAvailableWatchlistLevels(item);

                if (isEditing) {
                  return (
                    <form className="watchlist-item watchlist-editor" key={item.id} onSubmit={(event) => handleUpdateWatchlistItem(event, item.id)}>
                      <fieldset disabled={savingWatchlistId === item.id}>
                        <WatchlistPlanEditor draft={draft} onChange={updateEditingWatchlistField} />
                        <details className="watchlist-secondary-fields"><summary>Levels and chart</summary><div className="watchlist-editor-grid">
                          {structuredLevelInputs.map(([field, label]) => <label key={field}>{label}<input type="number" step="0.01" value={draft[field] || ""} onChange={(event) => updateEditingWatchlistField(field, event.target.value)} /></label>)}
                          <label>Additional Levels<textarea rows="2" value={draft.key_levels || ""} onChange={(event) => updateEditingWatchlistField("key_levels", event.target.value)} /></label>
                          <ImageUploadField label="Chart Screenshot" file={editingWatchlistScreenshotFile} existingUrl={removeEditingScreenshot ? null : item.screenshot} disabled={savingWatchlistId === item.id} status={savingWatchlistId === item.id && editingWatchlistScreenshotFile ? "uploading" : undefined} onChange={(file) => { setEditingWatchlistScreenshotFile(file); setRemoveEditingScreenshot(false); }} onRemove={item.screenshot ? () => { setRemoveEditingScreenshot(true); setEditingWatchlistScreenshotFile(null); } : undefined} />
                        </div></details>

                        <div className="watchlist-actions">
                          <button type="submit" disabled={savingWatchlistId === item.id}>{savingWatchlistId === item.id ? "Saving..." : "Save"}</button>
                          <button type="button" disabled={savingWatchlistId === item.id} onClick={handleCancelWatchlistEdit}>Cancel</button>
                        </div>
                      </fieldset>
                    </form>
                  );
                }

                return (
                  <article className={`watchlist-item-card ${getPriorityClass(item.priority)}`} key={item.id}>
                    <div className="watchlist-card-header">
                      <span className="priority-badge">#{item.priority}</span>
                      <div>
                        <h3>{item.ticker}{item.overall_rating ? ` · ${item.overall_rating}` : ""}</h3>
                      </div>
                      <strong>{item.direction}</strong>
                    </div>

                    <WatchlistPlanCard item={item} />
                    {availableLevels.length > 0 ? (
                      <div className="watchlist-levels">
                        {availableLevels.map(([label, value]) => (
                          <p key={label}><strong>{label}</strong> {value}</p>
                        ))}
                      </div>
                    ) : null}

                    {item.key_levels ? <p><strong>Additional:</strong> {item.key_levels}</p> : null}
                    {item.screenshot ? (
                      <button type="button" className="watchlist-screenshot-button" onClick={() => setPreviewScreenshot({ src: item.screenshot, ticker: item.ticker })}>
                        <img src={item.screenshot} alt={`${item.ticker} chart screenshot`} />
                      </button>
                    ) : null}
                    {item.notes ? <p className="watchlist-notes">{item.notes}</p> : null}

                    <div className="watchlist-actions">
                      <button type="button" onClick={(event) => handleStartEditingWatchlist(event, item)}>Edit</button>
                      <button type="button" disabled={savingWatchlistId === item.id} onClick={(event) => handleDeleteWatchlistItem(event, item.id)}>
                        {savingWatchlistId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="today-card risk-controls-section">
          <h2>Risk Controls</h2>
          <div className="risk-grid">
            <label>Standard Risk ($)<input type="number" min="0" value={riskControls.standardRisk} onChange={(event) => updateRiskControl("standardRisk", event.target.value)} /></label>
            <label>Reduced Risk ($)<input type="number" min="0" value={riskControls.reducedRisk} onChange={(event) => updateRiskControl("reducedRisk", event.target.value)} /></label>
            <label>Max Trades<input type="number" min="0" value={riskControls.maxTrades} onChange={(event) => updateRiskControl("maxTrades", event.target.value)} /></label>
            <label>Daily Loss Limit ($)<input type="number" min="0" value={riskControls.dailyLossLimit} onChange={(event) => updateRiskControl("dailyLossLimit", event.target.value)} /></label>
          </div>

          <div className="calculator-grid">
            <label>
              Direction
              <select value={calculator.direction} onChange={(event) => setCalculator((current) => ({ ...current, direction: event.target.value }))}>
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </label>
            <label>Entry Price<input type="number" min="0" step="0.01" value={calculator.entryPrice} onChange={(event) => setCalculator((current) => ({ ...current, entryPrice: event.target.value }))} /></label>
            <label>Stop Price<input type="number" min="0" step="0.01" value={calculator.stopPrice} onChange={(event) => setCalculator((current) => ({ ...current, stopPrice: event.target.value }))} /></label>
          </div>

          <div className="risk-results">
            <p><strong>Stop Distance:</strong> {positionSize.isValid ? positionSize.stopDistance : "-"}</p>
            <p><strong>Shares at Standard Risk:</strong> {positionSize.isValid ? positionSize.sharesAtStandardRisk : "-"}</p>
            <p><strong>Shares at Reduced Risk:</strong> {positionSize.isValid ? positionSize.sharesAtReducedRisk : "-"}</p>
            <p><strong>1R Price:</strong> {positionSize.isValid ? positionSize.oneRPrice : "-"}</p>
            <p><strong>2R Price:</strong> {positionSize.isValid ? positionSize.twoRPrice : "-"}</p>
          </div>
        </section>

        <section className="today-card trading-rules-section">
          <h2>Trading Rules</h2>
          <div className="rules-list">
            {rules.map((item, index) => (
              <label key={item.rule} className="rule-item">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleRule(index)}
                />
                {item.rule}
              </label>
            ))}
          </div>
        </section>
      </main>

      {previewScreenshot ? (
        <div className="screenshot-modal" role="dialog" aria-modal="true" aria-label="Chart screenshot preview">
          <button type="button" className="screenshot-modal-backdrop" onClick={() => setPreviewScreenshot(null)}>
            <span>Close preview</span>
          </button>
          <div className="screenshot-modal-content">
            <div className="selected-trade-review-header">
              <h2>{previewScreenshot.ticker} Chart</h2>
              <button type="button" onClick={() => setPreviewScreenshot(null)}>Close</button>
            </div>
            <img src={previewScreenshot.src} alt={`${previewScreenshot.ticker} chart screenshot preview`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TodayPage;
