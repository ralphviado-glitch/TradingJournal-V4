import { useEffect, useId, useState } from "react";
import { addTradeScreenshot, deleteTradeScreenshot, fetchTradeScreenshots } from "../../lib/tradeService";
import { IMAGE_ACCEPT } from "../ui/ImageUploadField";
import Modal from "../ui/Modal";

export default function QuickReviewScreenshots({ trade, load = fetchTradeScreenshots, upload = addTradeScreenshot, remove = deleteTradeScreenshot }) {
  const inputId = useId();
  const [screenshots, setScreenshots] = useState([]);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    load(trade.id).then((items) => {
      if (!active) return;
      const legacy = trade.screenshot && !items.some((item) => item.url === trade.screenshot)
        ? [{ path: trade.screenshotPath || trade.screenshotUrl || trade.screenshot, url: trade.screenshot, name: "Existing screenshot", legacy: true }]
        : [];
      setScreenshots([...legacy, ...items]);
      setStatus("idle");
    }).catch((cause) => { if (active) { setError(cause.message || "Screenshots could not be loaded."); setStatus("error"); } });
    return () => { active = false; };
  }, [load, trade.id, trade.screenshot, trade.screenshotPath, trade.screenshotUrl]);

  const onUpload = async (file) => {
    if (!file) return;
    setError(""); setStatus("uploading");
    try { const item = await upload(trade.id, file); setScreenshots((current) => [...current, item]); setStatus("idle"); }
    catch (cause) { setError(cause.message || "Upload failed. Try again."); setStatus("error"); }
  };
  const onRemove = async (item) => {
    setError(""); setStatus("removing");
    try { await remove(trade.id, item.path); setScreenshots((current) => current.filter((candidate) => candidate.path !== item.path)); setPreview(null); setStatus("idle"); }
    catch (cause) { setError(cause.message || "Screenshot could not be removed."); setStatus("error"); }
  };

  return <section className="review-detail-section quick-review-screenshots" aria-labelledby="screenshot-heading">
    <h3 id="screenshot-heading">Screenshots</h3>
    {status === "loading" ? <p className="field-helper">Loading screenshots...</p> : null}
    {status !== "loading" && screenshots.length === 0 ? <p className="field-helper">No screenshot attached.</p> : null}
    {screenshots.length ? <div className="quick-screenshot-grid">{screenshots.map((item) => <div className="quick-screenshot-item" key={item.path}>
      <button type="button" className="review-screenshot-button" onClick={() => setPreview(item)} aria-label={`Preview ${item.name}`}><img src={item.url} alt={`${trade.ticker} trade screenshot`} /></button>
      <button type="button" className="quick-screenshot-remove" disabled={status === "removing"} onClick={() => onRemove(item)}>Remove</button>
    </div>)}</div> : null}
    <label className={`ui-button ui-button-secondary image-upload-button${status === "uploading" ? " is-disabled" : ""}`} htmlFor={inputId}>{status === "uploading" ? "Uploading..." : "+ Add Screenshot"}</label>
    <input id={inputId} className="visually-hidden-file" type="file" multiple accept={IMAGE_ACCEPT} disabled={status === "uploading"} onChange={async (event) => { for (const file of [...(event.target.files || [])]) await onUpload(file); event.target.value = ""; }} />
    {error ? <p className="status-message error" role="alert">{error}</p> : null}
    {preview ? <Modal title={`${trade.ticker} Screenshot`} onClose={() => setPreview(null)} className="screenshot-preview-modal"><img src={preview.url} alt={`${trade.ticker} trade screenshot full-size preview`} /></Modal> : null}
  </section>;
}
