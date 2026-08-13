import { useState } from "react";
import Papa from "papaparse";
import { parseTradesFromRows } from "../../lib/csv";

function pluralizeTrade(count) {
  return `${count} trade${count === 1 ? "" : "s"}`;
}

function CSVUploader({ onDataUpload }) {
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setMessage("");
    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
      complete: async (results) => {
        const trades = parseTradesFromRows(results.data);

        if (trades.length === 0) {
          setMessage(
            "No trades were imported. Check that the CSV has either broker order columns like Date/Time, Symbol, Event or journal columns like date, ticker, entry_price, exit_price, shares, pnl."
          );
          setIsImporting(false);
          event.target.value = "";
          return;
        } else {
          setMessage(`Saving ${trades.length} trade${trades.length === 1 ? "" : "s"}...`);
        }

        const tradesWithIds = trades.map((trade, index) => ({
          ...trade,
          id: `${trade.date}-${trade.ticker}-${trade.entry_time}-${index}`,
        }));

        try {
          const importResult = await onDataUpload(tradesWithIds);
          const importedCount = importResult?.importedCount ?? trades.length;
          const skippedDuplicates = importResult?.skippedDuplicates ?? 0;

          setMessage(
            `Imported: ${pluralizeTrade(importedCount)}\nSkipped duplicates: ${pluralizeTrade(
              skippedDuplicates
            )}`
          );
        } catch (error) {
          console.error("Failed to import CSV trades:", error);
          setMessage(error.message || "The trades could not be saved.");
        } finally {
          setIsImporting(false);
          event.target.value = "";
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setMessage("The CSV could not be parsed. Please try another export file.");
        setIsImporting(false);
      },
    });
  };

  return (
    <div>
      <h3>Upload Trades CSV</h3>
      <input type="file" accept=".csv" disabled={isImporting} onChange={handleFileUpload} />
      {message ? (
        <p>
          {message.split("\n").map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export default CSVUploader;
