import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { focusInitialModalElement, handleModalKeyDown } from "./modalFocus";

const openModalStack = [];
let previousBodyOverflow = "";

function Modal({ title, children, onClose, className = "", initialFocusRef }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const modalToken = useRef(Symbol("modal"));
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const token = modalToken.current;
    const previouslyFocused = document.activeElement;
    if (openModalStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModalStack.push(token);

    const panel = panelRef.current;
    focusInitialModalElement(panel, initialFocusRef?.current);

    const handleKeyDown = (event) => {
      if (openModalStack.at(-1) !== token) return;
      handleModalKeyDown(event, panel, document.activeElement, () => onCloseRef.current?.());
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = openModalStack.lastIndexOf(token);
      if (index >= 0) openModalStack.splice(index, 1);
      if (openModalStack.length === 0) document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus?.();
    };
  }, [initialFocusRef]);

  const content = (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="ui-modal-backdrop" type="button" onClick={onClose}>
        <span>Close</span>
      </button>
      <div ref={panelRef} className={`ui-modal-panel ${className}`.trim()} tabIndex="-1">
        <div className="ui-modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="ui-modal-close" type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
  return typeof document === "undefined" ? content : createPortal(content, document.body);
}

export default Modal;
