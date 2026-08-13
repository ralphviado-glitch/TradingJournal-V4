import { useReducer, useRef, useState } from "react";
import { deleteAllTrades } from "../../lib/tradeService";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import {
  canConfirmDelete,
  DELETE_ALL_TRADES_CONFIRMATION,
  deleteStateReducer,
  initialDeleteState,
} from "./deleteSettingsState";

function SettingsPage() {
  const [state, dispatch] = useReducer(deleteStateReducer, initialDeleteState);
  const [confirmation, setConfirmation] = useState("");
  const deletionLock = useRef(false);
  const confirmationInputRef = useRef(null);

  const closeModal = () => {
    if (state.isDeleting) return;
    setConfirmation("");
    dispatch({ type: "cancel" });
  };

  const handleDelete = async () => {
    if (deletionLock.current || state.isDeleting || !canConfirmDelete(confirmation)) return;
    deletionLock.current = true;
    dispatch({ type: "start" });

    try {
      const result = await deleteAllTrades();
      setConfirmation("");
      dispatch({ type: "success", result });
      window.dispatchEvent(new CustomEvent("trades:deleted"));
    } catch (error) {
      dispatch({ type: "error", message: error.message || "Failed to delete trades." });
    } finally {
      deletionLock.current = false;
    }
  };

  return (
    <div className="page-stack settings-page">
      <header className="app-header">
        <h1>Settings</h1>
      </header>

      <section aria-labelledby="data-management-heading">
        <h2 id="data-management-heading" className="settings-section-title">Data Management</h2>
        <Card className="settings-danger-card">
          <div>
            <h3>Delete All Trades</h3>
            <p>Permanently delete all trades and associated trade screenshots from your account.</p>
          </div>
          <Button variant="danger" onClick={() => dispatch({ type: "open" })}>Delete All Trades</Button>
        </Card>
      </section>

      {state.result ? (
        <div className={state.result.screenshotCleanupFailures ? "status-message error" : "status-message success"} role="status">
          <strong>All trades deleted</strong>
          <span>{state.result.deletedTrades} trades deleted</span>
          <span>{state.result.deletedScreenshots} screenshots removed</span>
          {state.result.screenshotCleanupFailures ? <span>{state.result.screenshotCleanupFailures} screenshot(s) could not be removed and may remain orphaned.</span> : null}
        </div>
      ) : null}

      {state.isOpen ? (
        <Modal title="Delete all trades?" onClose={closeModal} initialFocusRef={confirmationInputRef}>
          <div className="settings-delete-modal">
            <p>This will permanently delete all trades and associated trade screenshots from your account.</p>
            <p>Your watchlist and market context will NOT be deleted.</p>
            <p><strong>This action cannot be undone.</strong></p>
            <label htmlFor="delete-all-trades-confirmation">Type <strong>{DELETE_ALL_TRADES_CONFIRMATION}</strong> to confirm.</label>
            <input ref={confirmationInputRef} id="delete-all-trades-confirmation" value={confirmation} disabled={state.isDeleting} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
            {state.error ? <p className="status-message error" role="alert">{state.error}</p> : null}
            <div className="ui-modal-actions">
              <Button variant="secondary" disabled={state.isDeleting} onClick={closeModal}>Cancel</Button>
              <Button variant="danger" disabled={state.isDeleting || !canConfirmDelete(confirmation)} onClick={handleDelete}>
                {state.isDeleting ? "Deleting trades..." : "Permanently Delete Trades"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default SettingsPage;
