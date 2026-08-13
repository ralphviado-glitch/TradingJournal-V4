import { useCallback, useEffect, useReducer, useState } from "react";
import { fetchMarketDays } from "../../lib/marketContextService";
import { generateTradeReview, getMarketDayForTrade, getTradeMarketAlignment } from "../../lib/calculations";
import { deleteTrade, fetchTrades, insertTrades, updateTrade } from "../../lib/tradeService";
import { calculateTradeExcursions } from "../../lib/excursionService";
import CSVUploader from "../../components/trades/CSVUploader";
import TradeTable from "../../components/trades/TradeTable";
import TradeReviewModal from "../../components/trades/TradeReviewModal";
import Button from "../../components/ui/Button";
import { initialTradeReviewState, tradeReviewReducer } from "../../lib/tradeReviewState";
import { processImportedTrades } from "../../lib/workflow/postTradeProcessor";
import { buildReviewQueue, getNextIncompleteTrade } from "../../lib/workflow/reviewCompleteness";
import { getWatchlistForDate } from "../../lib/watchlistService";
import { buildWatchlistLinkPayload } from "../../lib/workflow/watchlistMatcher";
import { useSearchParams } from "react-router-dom";


function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTicker, setSelectedTicker] = useState("ALL");
  const [selectedSetup, setSelectedSetup] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tradeReviewState, dispatchTradeReview] = useReducer(tradeReviewReducer, initialTradeReviewState);
  const [requestedEditTrade, setRequestedEditTrade] = useState(null);
  const selectedTrade = tradeReviewState.selectedTrade;
  const [marketDays, setMarketDays] = useState([]);
  const selectedTradeReview = generateTradeReview(selectedTrade);
  const selectedTradeMarketDay = getMarketDayForTrade(selectedTrade, marketDays);
  const selectedTradeMarketAlignment = getTradeMarketAlignment(selectedTrade, selectedTradeMarketDay);
  const [loadStatus, setLoadStatus] = useState({ type: "loading", message: "Loading dashboard..." });
  const [actionStatus, setActionStatus] = useState({ type: "idle", message: "" });
  const [excursionStatus, setExcursionStatus] = useState({ type: "idle", message: "" });
  const [savingTradeId, setSavingTradeId] = useState(null);
  const [deletingTradeId, setDeletingTradeId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [selectedTradeWatchlist, setSelectedTradeWatchlist] = useState([]);
  const [trades, setTrades] = useState([]);
  const closeTradeReview = useCallback(() => dispatchTradeReview({ type: "close" }), []);
  const openTradeReview = useCallback((trade) => {
    dispatchTradeReview({ type: "open", trade });
    setSelectedTradeWatchlist([]);
    getWatchlistForDate(trade.trade_date || trade.date)
      .then(setSelectedTradeWatchlist)
      .catch(() => setSelectedTradeWatchlist([]));
  }, []);
  const clearEditRequest = useCallback(() => setRequestedEditTrade(null), []);

  useEffect(() => {
    async function loadDashboardData() {
      setLoadStatus({ type: "loading", message: "Loading dashboard..." });

      try {
        const [savedTrades, savedMarketDays] = await Promise.all([
          fetchTrades(),
          fetchMarketDays(),
        ]);
        setTrades(savedTrades);
        setMarketDays(savedMarketDays);
        setLoadStatus({ type: "success", message: "" });
        const requestedTrade = savedTrades.find((trade) => trade.id === searchParams.get("review"));
        if (requestedTrade) {
          dispatchTradeReview({ type: "open", trade: requestedTrade });
          getWatchlistForDate(requestedTrade.trade_date || requestedTrade.date).then(setSelectedTradeWatchlist).catch(() => setSelectedTradeWatchlist([]));
          setSearchParams({}, { replace: true });
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setLoadStatus({
          type: "error",
          message: "Failed to load dashboard data. Check Supabase configuration and table policies.",
        });
      }
    }
    
    loadDashboardData();
  }, [searchParams, setSearchParams]);

  const handleDeleteTrade = async (tradeId) => {
    if (deletingTradeId) return;

    const confirmed = window.confirm("Delete this trade from your journal?");

    if (!confirmed) return;

    setDeletingTradeId(tradeId);
    setActionStatus({ type: "loading", message: "Deleting trade..." });

    try {
      await deleteTrade(tradeId);
      setTrades((currentTrades) => currentTrades.filter((trade) => trade.id !== tradeId));

      if (selectedTrade?.id === tradeId) {
        dispatchTradeReview({ type: "close" });
      }

      setActionStatus({ type: "success", message: "Trade deleted." });
    } catch (error) {
      console.error("Failed to delete trade:", error);
      setActionStatus({ type: "error", message: error.message || "Failed to delete trade." });
    } finally {
      setDeletingTradeId(null);
    }
  };

  const handleUpdateTrade = async (tradeId, updatedFields) => {
    if (savingTradeId) return;

    setSavingTradeId(tradeId);
    setActionStatus({ type: "loading", message: "Saving trade..." });

    try {
      const savedTrade = await updateTrade(tradeId, updatedFields);
      setTrades((currentTrades) =>
        currentTrades.map((trade) => (trade.id === tradeId ? savedTrade : trade))
      );

      if (selectedTrade?.id === tradeId) {
        dispatchTradeReview({ type: "update", trade: savedTrade });
      }

      setActionStatus({ type: "success", message: "Trade saved." });
      return savedTrade;
    } catch (error) {
      console.error("Failed to save trade:", error);
      setActionStatus({ type: "error", message: error.message || "Failed to save trade." });
      throw error;
    } finally {
      setSavingTradeId(null);
    }
  };

  const handleCalculateExcursions = async (trade) => {
    if (!trade || savingTradeId) return;

    setSavingTradeId(trade.id);
    setExcursionStatus({ type: "loading", message: "Calculating excursions..." });

    try {
      const excursionUpdates = await calculateTradeExcursions(trade);
      const savedTrade = await updateTrade(trade.id, excursionUpdates);

      setTrades((currentTrades) =>
        currentTrades.map((currentTrade) =>
          currentTrade.id === savedTrade.id ? savedTrade : currentTrade
        )
      );
      dispatchTradeReview({ type: "update", trade: savedTrade });
      setExcursionStatus({ type: "success", message: "Excursions calculated." });
    } catch (error) {
      console.error("Failed to calculate excursions:", error);
      setExcursionStatus({
        type: "error",
        message: error.message || "Market data provider not configured.",
      });
    } finally {
      setSavingTradeId(null);
    }
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

    const tradeDate = new Date(trade.trade_date || trade.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const dateMatches =
      (!start || tradeDate >= start) && (!end || tradeDate <= end);

    return tickerMatches && setupMatches && resultMatches && dateMatches;
  });

  if (loadStatus.type === "loading") {
    return <p className="status-message loading">{loadStatus.message}</p>;
  }

  if (loadStatus.type === "error") {
    return <p className="status-message error">{loadStatus.message}</p>;
    }

  const handleDataUpload = async (uploadedTrades) => {
    if (isImporting) return;

    setIsImporting(true);
    setActionStatus({ type: "loading", message: "Saving imported trades..." });

    try {
      const importResult = await insertTrades(uploadedTrades);
      setActionStatus({ type: "loading", message: "Imported trades. Running post-trade processing..." });
      const processing = await processImportedTrades(importResult.trades);
      setTrades((currentTrades) => [...currentTrades, ...processing.trades]);
      setImportSummary({ ...processing.summary, newTrades: importResult.importedCount, duplicates: importResult.skippedDuplicates });
      setActionStatus({
        type: "success",
        message: `Imported: ${importResult.importedCount} trade${
          importResult.importedCount === 1 ? "" : "s"
        }. Skipped duplicates: ${importResult.skippedDuplicates} trade${
          importResult.skippedDuplicates === 1 ? "" : "s"
        }.`,
      });
      return importResult;
    } catch (error) {
      console.error("Failed to save trades:", error);
      setActionStatus({ type: "error", message: error.message || "Failed to save trades to Supabase." });
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  const handleWatchlistLink = async (watchlistItem) => {
    if (!selectedTrade) return;
    await handleUpdateTrade(selectedTrade.id, buildWatchlistLinkPayload(selectedTrade, watchlistItem));
  };

  const reviewQueue = buildReviewQueue(trades);
  const nextReviewTrade = selectedTrade ? getNextIncompleteTrade(trades, selectedTrade.id) : null;

  return (
    <div className="page-stack">
      <header className="app-header">
        <h1>Journal</h1>

        <CSVUploader onDataUpload={handleDataUpload} />
        {actionStatus.message ? (
          <p className={`status-message ${actionStatus.type}`}>{actionStatus.message}</p>
        ) : null}
        {importSummary ? (
          <section className="import-processing-summary" aria-label="Import processing summary">
            <h2>Import Complete</h2>
            <p>New trades: {importSummary.newTrades} · Duplicates skipped: {importSummary.duplicates}</p>
            <p>Excursions calculated: {importSummary.excursionsCalculated} · Pending/failed: {importSummary.excursionsPendingOrFailed}</p>
            <p>Scale-outs detected: {importSummary.scaleOutsDetected} · Manual management review: {importSummary.manualManagementReview}</p>
            <p>Watchlist matches: {importSummary.watchlistMatches} · Unmatched: {importSummary.unmatchedTrades}</p>
            <Button onClick={() => reviewQueue[0] && openTradeReview(reviewQueue[0])} disabled={!reviewQueue.length}>Review Trades ({importSummary.tradesRequiringReview})</Button>
          </section>
        ) : null}
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

      {tradeReviewState.isOpen && selectedTrade ? (
        <TradeReviewModal
          trade={selectedTrade}
          reviews={selectedTradeReview}
          marketDay={selectedTradeMarketDay}
          marketAlignment={selectedTradeMarketAlignment}
          onClose={closeTradeReview}
          onEditTrade={setRequestedEditTrade}
          onCalculateExcursions={handleCalculateExcursions}
          excursionStatus={excursionStatus}
          isCalculatingExcursions={savingTradeId === selectedTrade.id}
          watchlistItems={selectedTradeWatchlist}
          onLinkWatchlist={handleWatchlistLink}
          nextTrade={nextReviewTrade}
          onNextTrade={openTradeReview}
          onSaveReview={handleUpdateTrade}
          isSavingTrade={savingTradeId === selectedTrade.id}
        />
      ) : null}

      <TradeTable
        trades={filteredTrades}
        onDeleteTrade={handleDeleteTrade}
        onUpdateTrade={handleUpdateTrade}
        key={requestedEditTrade?.id || "trade-table"}
        onSelectTrade={openTradeReview}
        requestedEditTrade={requestedEditTrade}
        onEditRequestHandled={clearEditRequest}
        savingTradeId={savingTradeId}
        deletingTradeId={deletingTradeId}
      />

    </div>
  );
}

export default DashboardPage;
