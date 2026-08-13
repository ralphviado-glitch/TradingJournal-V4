export const MODAL_FOCUSABLE_SELECTOR = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function focusInitialModalElement(panel, preferredElement) {
  const target = preferredElement && !preferredElement.disabled
    ? preferredElement
    : panel?.querySelector("[data-modal-initial-focus]") || panel?.querySelector(MODAL_FOCUSABLE_SELECTOR);
  target?.focus();
}

export function handleModalKeyDown(event, panel, activeElement, onClose) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose?.();
    return;
  }

  if (event.key !== "Tab" || !panel) return;

  const focusable = [...panel.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)];
  if (focusable.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
