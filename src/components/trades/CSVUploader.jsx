import { useId, useState } from "react";
import Papa from "papaparse";
import { fetchImportPreferences } from "../../lib/importPreferencesService";
import { parseUploadedRows } from "../../lib/importPipeline";
import { useEffect } from "react";

function pluralizeTrade(count) {
  return `${count} trade${count === 1 ? "" : "s"}`;
}

function CSVUploader({ onDataUpload }) {
  const inputId = useId();
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRows, setPendingRows] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [preferredAccount, setPreferredAccount] = useState(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    let active = true;
    fetchImportPreferences().then((preferences) => { if (active) setPreferredAccount(preferences.preferredTtpAccount); })
      .catch((error) => { if (active) setMessage(error.message || "Import preferences could not be loaded."); })
      .finally(() => { if (active) setPreferencesLoaded(true); });
    return () => { active = false; };
  }, []);

  const saveTrades = async (trades) => {
    const diagnostics = trades.diagnostics;
    const payload = trades.map((trade, index) => ({ ...trade, id: `${trade.date}-${trade.ticker}-${trade.entry_time}-${index}` }));
    const result = await onDataUpload(payload, diagnostics);
    setMessage(`Imported: ${pluralizeTrade(result?.importedCount ?? trades.length)}\nSkipped duplicates: ${pluralizeTrade(result?.skippedDuplicates ?? 0)}`);
  };

  const chooseAccount = async (event) => {
    if (!event.target.value || !pendingRows) return;
    setIsImporting(true);
    try { await saveTrades(parseUploadedRows(pendingRows, null, { account: event.target.value })); setPendingRows(null); setAccounts([]); }
    catch (error) { setMessage(error.message || "The trades could not be saved."); }
    finally { setIsImporting(false); }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;
    setFileName(file.name);

    setMessage("");
    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
      complete: async (results) => {
        const trades = parseUploadedRows(results.data, preferredAccount);

        if (trades.diagnostics?.preferredAccountMissing) {
          setMessage(`${trades.diagnostics.error}\nAccounts detected: ${trades.diagnostics.accounts.join(", ")}\nVerify the export or update Import Preferences in Settings.`);
          setIsImporting(false); event.target.value = ""; return;
        }

        if (trades.diagnostics?.ambiguous) {
          setPendingRows(results.data);
          setAccounts(trades.diagnostics.accounts);
          setMessage("Multiple execution streams could not be reconciled safely. Select the execution account manually.");
          setIsImporting(false);
          event.target.value = "";
          return;
        }

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

        try {
          await saveTrades(trades);
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
    <div className="csv-upload-control">
      <input id={inputId} className="visually-hidden-file" type="file" accept=".csv" disabled={isImporting || !preferencesLoaded} onChange={handleFileUpload} />
      <label htmlFor={inputId} className={`ui-button ui-button-secondary ${isImporting || !preferencesLoaded ? "is-disabled" : ""}`}>{isImporting ? "Importing..." : "Import Trades CSV"}</label>
      {fileName ? <span className="csv-file-name" title={fileName}>{fileName}</span> : null}
      {accounts.length ? <label> Execution account <select defaultValue="" onChange={chooseAccount}><option value="" disabled>Select account</option>{accounts.map((account) => <option key={account} value={account}>{account || "Unlabelled account"}</option>)}</select></label> : null}
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
