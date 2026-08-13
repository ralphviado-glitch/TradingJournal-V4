import { useId } from "react";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export default function ImageUploadField({ label = "Screenshot", file, existingUrl, onChange, onRemove, status, disabled = false, accept = IMAGE_ACCEPT }) {
  const id = useId();
  const action = existingUrl ? "Replace Screenshot" : file ? "Change Screenshot" : "Upload Screenshot";
  return <div className="image-upload-field">
    <span className="image-upload-label">{label}</span>
    {existingUrl ? <a className="image-upload-thumbnail" href={existingUrl} target="_blank" rel="noreferrer"><img src={existingUrl} alt={`${label} preview`} /></a> : null}
    <div className="image-upload-actions">
      <label className={`ui-button ui-button-secondary image-upload-button${disabled ? " is-disabled" : ""}`} htmlFor={id}>{status === "uploading" ? "Uploading..." : action}</label>
      {existingUrl && onRemove ? <button className="ui-button ui-button-secondary" type="button" disabled={disabled || status === "removing"} onClick={onRemove}>{status === "removing" ? "Removing..." : "Remove"}</button> : null}
    </div>
    <input id={id} className="visually-hidden-file" type="file" accept={accept} disabled={disabled} onChange={(event) => onChange?.(event.target.files?.[0] || null)} />
    <small className={`image-upload-status${status === "error" ? " error" : ""}`} aria-live="polite">{status === "error" ? "Upload failed. Try again." : status === "uploaded" ? "Screenshot uploaded" : file?.name || (existingUrl ? "Screenshot uploaded" : "No image selected")}</small>
  </div>;
}
