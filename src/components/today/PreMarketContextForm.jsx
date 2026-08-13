import { useState } from "react";
import Button from "../ui/Button";
import ImageUploadField from "../ui/ImageUploadField";

const BIASES = ["Bullish", "Bearish", "Neutral", "Mixed"];
const ENVIRONMENTS = ["Trending", "Range", "Choppy", "Extended", "Compression", "Expansion", "Mixed", "Other"];

function SelectField({ label, value, options, onChange }) {
  return <label>{label}<select value={value || ""} onChange={(event) => onChange(event.target.value)}><option value="">Unknown</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function IndexCard({ symbol, plan, update, setFile }) {
  const [expanded, setExpanded] = useState(true);
  const prefix = symbol.toLowerCase();
  const screenshot = plan[`${prefix}Screenshot`];
  return <section className="index-plan-card">
    <button type="button" className="index-plan-summary" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <strong>{symbol} Analysis</strong><span>{plan[`${prefix}_intraday_bias`] || plan[`${prefix}_bias`] || "Unknown"} · {plan[`${prefix}_market_environment`] || "Unknown"}</span><span>Key {plan[`${prefix}_most_important_level`] || "N/A"} · Bull &gt; {plan[`${prefix}_bull_trigger`] || "N/A"} · Bear &lt; {plan[`${prefix}_bear_trigger`] || "N/A"}</span>
    </button>
    {expanded ? <div className="index-plan-fields">
      <div className="compact-field-grid">
        <SelectField label="Weekly Bias" value={plan[`${prefix}_weekly_bias`]} options={BIASES} onChange={(value) => update(`${prefix}_weekly_bias`, value)} />
        <SelectField label="Daily Bias" value={plan[`${prefix}_daily_bias`]} options={BIASES} onChange={(value) => update(`${prefix}_daily_bias`, value)} />
        <SelectField label="Intraday Bias" value={plan[`${prefix}_intraday_bias`] || plan[`${prefix}_bias`]} options={BIASES} onChange={(value) => { update(`${prefix}_intraday_bias`, value); update(`${prefix}_bias`, value); }} />
        <SelectField label="Market Environment" value={plan[`${prefix}_market_environment`]} options={ENVIRONMENTS} onChange={(value) => update(`${prefix}_market_environment`, value)} />
      </div>
      <div className="level-field-grid">
        {["pdh", "pdl", "pmh", "pml"].map((field) => <label key={field}>{field.toUpperCase()}<input type="number" step="0.01" value={plan[`${prefix}_${field}`] || ""} onChange={(event) => update(`${prefix}_${field}`, event.target.value)} /></label>)}
        <label>Key Level<input type="number" step="0.01" value={plan[`${prefix}_most_important_level`] || ""} onChange={(event) => update(`${prefix}_most_important_level`, event.target.value)} /></label>
        <label>Bull Trigger<input type="number" step="0.01" value={plan[`${prefix}_bull_trigger`] || ""} onChange={(event) => update(`${prefix}_bull_trigger`, event.target.value)} /></label>
        <label>Bear Trigger<input type="number" step="0.01" value={plan[`${prefix}_bear_trigger`] || ""} onChange={(event) => update(`${prefix}_bear_trigger`, event.target.value)} /></label>
      </div>
      <label>Liquidity Target<input value={plan[`${prefix}_liquidity_target`] || ""} onChange={(event) => update(`${prefix}_liquidity_target`, event.target.value)} /></label>
      <label>Game Plan / Bottom Line<textarea rows="3" value={plan[`${prefix}_game_plan`] || ""} onChange={(event) => update(`${prefix}_game_plan`, event.target.value)} /></label>
      <ImageUploadField label={`${symbol} Screenshot`} existingUrl={plan[`remove${symbol}Screenshot`] ? null : screenshot} onChange={(file) => { setFile(file); update(`remove${symbol}Screenshot`, false); }} onRemove={screenshot ? () => { setFile(null); update(`remove${symbol}Screenshot`, true); } : undefined} />
    </div> : null}
  </section>;
}

export default function PreMarketContextForm({ plan, update, onSubmit, isSaving, setQQQFile, setSPYFile }) {
  return <form className="premarket-context" onSubmit={onSubmit}>
    <fieldset disabled={isSaving}>
      <section className="overall-market-context"><h2>Overall Market Context</h2><div className="compact-field-grid">
        <label>Trading Date<input type="date" value={plan.trade_date} onChange={(event) => update("trade_date", event.target.value)} /></label>
        <SelectField label="Market Condition" value={plan.market_condition} options={["Trending", "Range", "Choppy", "Extended", "Mixed", "Other"]} onChange={(value) => update("market_condition", value)} />
        <label>Expected Trading Day<input value={plan.expected_trading_day || ""} onChange={(event) => update("expected_trading_day", event.target.value)} /></label>
        <label>Event Type<input value={plan.event_type || ""} onChange={(event) => update("event_type", event.target.value)} /></label>
        <label>Event Name<input value={plan.event_name || ""} onChange={(event) => update("event_name", event.target.value)} /></label>
      </div><label>General Market Notes<textarea rows="2" value={plan.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label></section>
      <div className="index-plan-grid"><IndexCard symbol="QQQ" plan={plan} update={update} setFile={setQQQFile} /><IndexCard symbol="SPY" plan={plan} update={update} setFile={setSPYFile} /></div>
      <div className="premarket-save"><Button type="submit" disabled={isSaving}>{isSaving ? "Saving Pre-Market Plan..." : "Save Pre-Market Plan"}</Button></div>
    </fieldset>
  </form>;
}
