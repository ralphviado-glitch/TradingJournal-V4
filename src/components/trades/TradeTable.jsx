import { useState } from "react";

function TradeTable({ trades, onDeleteTrade, onUpdateTrade, onSelectTrade }) {
  const [editingTradeId, setEditingTradeId] = useState(null);
  const [editSetup, setEditSetup] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editMistakeTags, setEditMistakeTags] = useState("");
  const [editEmotionTags, setEditEmotionTags] = useState("");
  const [editRulesFollowed, setEditRulesFollowed] = useState(false);
  const [editScreenshot, setEditScreenshot] = useState("");

  const handleEditClick = (trade) => {
    setEditingTradeId(trade.id);
    setEditSetup(trade.setup || "Unclassified");
    setEditNotes(trade.notes || "");
    setEditGrade(trade.grade || "");
    setEditMistakeTags((trade.mistakeTags || []).join(", "));
    setEditEmotionTags((trade.emotionTags || []).join(", "));
    setEditRulesFollowed(trade.rulesFollowed || false);
    setEditScreenshot(trade.screenshot || "");
    
  };

  const handleSaveClick = (tradeId) => {
    onUpdateTrade(tradeId, {
      setup: editSetup,
      notes: editNotes,
      grade: editGrade,
      mistakeTags: editMistakeTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
      emotionTags: editEmotionTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
      rulesFollowed: editRulesFollowed,
      screenshot: editScreenshot,
    });

    setEditingTradeId(null);
    setEditSetup("");
    setEditNotes("");
    setEditGrade("");
    setEditMistakeTags("");
    setEditEmotionTags("");
    setEditRulesFollowed(false);
    setEditScreenshot("");
  };

  const handleCancelClick = () => {
    setEditingTradeId(null);
    setEditSetup("");
    setEditNotes("");
  };

  const handleScreenshotUpload = (event) => {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onloadend = () => {
    setEditScreenshot(reader.result);
  };

  reader.readAsDataURL(file);
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
            <th>Grade</th>
            <th>Mistake Tags</th>
            <th>Emotion Tags</th>
            <th>Rules Followed</th>
            <th>Notes</th>
            <th>Screenshot</th>
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
                    <select
                      value={editGrade}
                      onChange={(event) => setEditGrade(event.target.value)}
                    >
                      <option value="">No Grade</option>
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  ) : (
                    trade.grade || "-"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      value={editMistakeTags}
                      onChange={(event) => setEditMistakeTags(event.target.value)}
                      placeholder="Late entry, FOMO"
                    />
                  ) : (
                    (trade.mistakeTags || []).join(", ") || "-"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      value={editEmotionTags}
                      onChange={(event) => setEditEmotionTags(event.target.value)}
                      placeholder="Calm, Hesitant"
                    />
                  ) : (
                    (trade.emotionTags || []).join(", ") || "-"
                  )}
                </td>

                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={editRulesFollowed}
                      onChange={(event) => setEditRulesFollowed(event.target.checked)}
                    />
                  ) : (
                    trade.rulesFollowed ? "Yes" : "No"
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                    />
                  ) : trade.screenshot ? (
                    <img
                      src={trade.screenshot}
                      alt="Trade screenshot"
                      className="trade-screenshot-thumb"
                    />
                  ) : (
                    "-"
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
                      <button onClick={() => onSelectTrade(trade)}>View</button>
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
