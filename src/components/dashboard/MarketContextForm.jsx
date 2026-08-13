import { useState } from "react";

function MarketContextForm({ onSave, isSaving = false }) {
    const [tradeDate, setTradeDate] = useState("");
    const [marketCondition, setMarketCondition] = useState("");
    const [spyBias, setSpyBias] = useState("");
    const [qqqBias, setQqqBias] = useState("");
    const [notes, setNotes] = useState("");
    const [spyPdh, setSpyPdh] = useState("");
    const [spyPdl, setSpyPdl] = useState("");
    const [spyPmh, setSpyPmh] = useState("");
    const [spyPml, setSpyPml] = useState("");
    const [spyLiquidityTarget, setSpyLiquidityTarget] = useState("");
    const [qqqPdh, setQqqPdh] = useState("");
    const [qqqPdl, setQqqPdl] = useState("");
    const [qqqPmh, setQqqPmh] = useState("");
    const [qqqPml, setQqqPml] = useState("");
    const [qqqLiquidityTarget, setQqqLiquidityTarget] = useState("");
    const [eventType, setEventType] = useState("");
    const [eventName, setEventName] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSave({
        trade_date: tradeDate,
        market_condition: marketCondition,

        spy_bias: spyBias,
        spy_pdh: spyPdh,
        spy_pdl: spyPdl,
        spy_pmh: spyPmh,
        spy_pml: spyPml,
        spy_liquidity_target: spyLiquidityTarget,

        qqq_bias: qqqBias,
        qqq_pdh: qqqPdh,
        qqq_pdl: qqqPdl,
        qqq_pmh: qqqPmh,
        qqq_pml: qqqPml,
        qqq_liquidity_target: qqqLiquidityTarget,

        event_type: eventType,
        event_name: eventName,

        notes,
     });

        setTradeDate("");
        setMarketCondition("");
        setSpyBias("");
        setQqqBias("");
        setNotes("");
        setSpyPdh("");
        setSpyPdl("");
        setSpyPmh("");
        setSpyPml("");
        setSpyLiquidityTarget("");

        setQqqPdh("");
        setQqqPdl("");
        setQqqPmh("");
        setQqqPml("");
        setQqqLiquidityTarget("");
        setEventType("");
        setEventName("");
  };

  return (
    <div className="chart-card">
      <h3>Market Context</h3>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving}>
        <input
          type="date"
          value={tradeDate}
          required
          onChange={(event) => setTradeDate(event.target.value)}
        />

        <select
          value={marketCondition}
          required
          onChange={(event) => setMarketCondition(event.target.value)}
        >
          <option value="">Market Condition</option>
          <option value="Trending">Trending</option>
          <option value="Range">Range</option>
          <option value="Choppy">Choppy</option>
          <option value="Extended">Extended</option>
          <option value="Reversal">Reversal</option>
          <option value="News Driven">News Driven</option>
          <option value="Low Volume">Low Volume</option>
        </select>

        <select
          value={spyBias}
          required
          onChange={(event) => setSpyBias(event.target.value)}
        >
          <option value="">SPY Bias</option>
          <option value="Bullish">Bullish</option>
          <option value="Bearish">Bearish</option>
          <option value="Neutral">Neutral</option>
          <option value="Range">Range</option>
        </select>

        <select
          value={qqqBias}
          required
          onChange={(event) => setQqqBias(event.target.value)}
        >
          <option value="">QQQ Bias</option>
          <option value="Bullish">Bullish</option>
          <option value="Bearish">Bearish</option>
          <option value="Neutral">Neutral</option>
          <option value="Range">Range</option>
        </select>

        <h4>SPY Levels</h4>

            <input
            type="number"
            step="0.01"
            placeholder="SPY PDH"
            value={spyPdh}
            onChange={(event) => setSpyPdh(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="SPY PDL"
            value={spyPdl}
            onChange={(event) => setSpyPdl(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="SPY PMH"
            value={spyPmh}
            onChange={(event) => setSpyPmh(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="SPY PML"
            value={spyPml}
            onChange={(event) => setSpyPml(event.target.value)}
            />

            <input
            type="text"
            placeholder="SPY Liquidity Target"
            value={spyLiquidityTarget}
            onChange={(event) => setSpyLiquidityTarget(event.target.value)}
            />

            <h4>QQQ Levels</h4>

            <input
            type="number"
            step="0.01"
            placeholder="QQQ PDH"
            value={qqqPdh}
            onChange={(event) => setQqqPdh(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="QQQ PDL"
            value={qqqPdl}
            onChange={(event) => setQqqPdl(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="QQQ PMH"
            value={qqqPmh}
            onChange={(event) => setQqqPmh(event.target.value)}
            />

            <input
            type="number"
            step="0.01"
            placeholder="QQQ PML"
            value={qqqPml}
            onChange={(event) => setQqqPml(event.target.value)}
            />

            <input
            type="text"
            placeholder="QQQ Liquidity Target"
            value={qqqLiquidityTarget}
            onChange={(event) => setQqqLiquidityTarget(event.target.value)}
            />

            <h4>News / Event Context</h4>

                <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                >
                <option value="">Event Type</option>
                <option value="None">None</option>
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

                <input
                type="text"
                placeholder="Event Name"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                />

        <textarea
          value={notes}
          placeholder="Market notes"
          onChange={(event) => setNotes(event.target.value)}
        />

        <button type="submit">{isSaving ? "Saving..." : "Save Market Context"}</button>
        </fieldset>
      </form>
    </div>
  );
}

export default MarketContextForm;
