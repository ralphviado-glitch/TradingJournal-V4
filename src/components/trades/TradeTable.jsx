import { useState } from "react";

function TradeTable({ trades, onDeleteTrade, onUpdateTrade }) {
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editSetup, setEditSetup] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleEditClick = (trade) => {
    setEditingTradeId(trade.id);
    setEditSetup(trade.setup || "Unclassified");
    setEditNotes(trade.notes || "");
  };

  const handleSaveClick = (tradeId) => {
    onUpdateTrade(tradeId, {
      setup: editSetup,
      notes: editNotes,
    });

    setEditingTradeId(null);
    setEditSetup("");
    setEditNotes("");
  };

  const handleCancelClick = () => {
    setEditingTradeId(null);
    setEditSetup("");
    setEditNotes("");
  };

  if (!trades || trades.length === 0) {
    return <p>No trades yet</p>;
  }

  return (
    <div className="trade-table-wrapper">
      <table className="trade-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Ticker</th>
            <th>Direction</th>
            <th>Result</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Shares</th>
            <th>PnL</th>
            <th>Setup</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isEditing = editingTradeId === trade.id;
            const pnl = Number(trade.pnl || 0);
            const result = pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven";

            return (
              <tr key={trade.id}>
                <td>{trade.date}</td>
                <td>{trade.ticker}</td>
                <td>{trade.direction || "N/A"}</td>
                <td className={pnl > 0 ? "result-win" : pnl < 0 ? "result-loss" : "result-breakeven"}>
                  {result}
                </td>
                <td>{trade.entry_price}</td>
                <td>{trade.exit_price}</td>
                <td>{trade.shares}</td>
                <td>{trade.pnl}</td>
                <td>
                  {isEditing ? (
                    <input
                      value={editSetup}
                      onChange={(event) => setEditSetup(event.target.value)}
                      placeholder="Setup"
                    />
                  ) : (
                    trade.setup || "Unclassified"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <textarea
                      value={editNotes}
                      onChange={(event) => setEditNotes(event.target.value)}
                      placeholder="Notes"
                    />
                  ) : (
                    trade.notes || "-"
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSaveClick(trade.id)}>Save</button>
                      <button onClick={handleCancelClick}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(trade)}>Edit</button>
                      <button onClick={() => onDeleteTrade(trade.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TradeTable;
