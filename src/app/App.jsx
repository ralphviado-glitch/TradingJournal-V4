import { useEffect, useState } from "react";
import DashboardPage from "../features/dashboard/DashboardPage";
import CSVUploader from "../components/trades/CSVUploader";
import TradeTable from "../components/trades/TradeTable";
import TradeSummary from "../components/trades/TradeSummary";
import OrderBreakdown from "../components/trades/OrderBreakdown";

function App() {
  const [selectedTicker, setSelectedTicker] = useState("ALL");
  const [selectedSetup, setSelectedSetup] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTrade, setSelectedTrade] = useState(null);

  const [trades, setTrades] = useState(() => {
    try {
      const savedTrades = localStorage.getItem("trades");

      if (savedTrades) {
        return JSON.parse(savedTrades);
      }
    } catch (error) {
      console.error("Failed to load saved trades:", error);
      localStorage.removeItem("trades");
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("trades", JSON.stringify(trades));
  }, [trades]);

  const handleClearData = () => {
    localStorage.removeItem("trades");
    setTrades([]);
  };

  const handleDeleteTrade = (tradeId) => {
    const updatedTrades = trades.filter((trade) => trade.id !== tradeId);
    setTrades(updatedTrades);
  };

  const handleUpdateTrade = (tradeId, updatedFields) => {
    const updatedTrades = trades.map((trade) => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          ...updatedFields,
        };
      }

      return trade;
    });

    setTrades(updatedTrades);
  };

  const filteredTrades = trades.filter((trade) => {
    const tickerMatches =
      selectedTicker === "ALL" || trade.ticker === selectedTicker;

    const setupMatches =
      selectedSetup === "ALL" || trade.setup === selectedSetup;

    const pnl = Number(trade.pnl || 0);

    const resultMatches =
      selectedResult === "ALL" ||
      (selectedResult === "WIN" && pnl > 0) ||
      (selectedResult === "LOSS" && pnl < 0) ||
      (selectedResult === "BREAKEVEN" && pnl === 0);

    const tradeDate = new Date(trade.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const dateMatches =
      (!start || tradeDate >= start) && (!end || tradeDate <= end);

    return tickerMatches && setupMatches && resultMatches && dateMatches;
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trading Journal V3</h1>

        <CSVUploader onDataUpload={setTrades} onClearData={handleClearData} />

        <select
          value={selectedTicker}
          onChange={(event) => setSelectedTicker(event.target.value)}
        >
          <option value="ALL">All Tickers</option>

          {[...new Set(trades.map((trade) => trade.ticker))].map((ticker) => (
            <option key={ticker} value={ticker}>
              {ticker}
            </option>
          ))}
        </select>

        <select
          value={selectedSetup}
          onChange={(event) => setSelectedSetup(event.target.value)}
        >
          <option value="ALL">All Setups</option>

          {[...new Set(trades.map((trade) => trade.setup || "Unclassified"))].map(
            (setup) => (
              <option key={setup} value={setup}>
                {setup}
              </option>
            )
          )}
        </select>

        <select
          value={selectedResult}
          onChange={(event) => setSelectedResult(event.target.value)}
        >
          <option value="ALL">All Results</option>
          <option value="WIN">Wins</option>
          <option value="LOSS">Losses</option>
          <option value="BREAKEVEN">Breakeven</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </header>

      <TradeTable
        trades={filteredTrades}
        onDeleteTrade={handleDeleteTrade}
        onUpdateTrade={handleUpdateTrade}
        onSelectTrade={setSelectedTrade}
      />

      {selectedTrade ? (
        <section className="dashboard-section">
          <TradeSummary trade={selectedTrade} />
          <OrderBreakdown orders={selectedTrade.orders} />
        </section>
      ) : null}

      <DashboardPage trades={filteredTrades} />
    </div>
  );
}

export default App;
