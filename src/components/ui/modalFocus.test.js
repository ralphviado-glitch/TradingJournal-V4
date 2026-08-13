import { describe, expect, it, vi } from "vitest";
import { focusInitialModalElement, handleModalKeyDown } from "./modalFocus";
import { canConfirmDelete } from "../../pages/settings/deleteSettingsState";

function element(name) {
  return { name, disabled: false, focus: vi.fn() };
}

function event(key, shiftKey = false) {
  return { key, shiftKey, preventDefault: vi.fn() };
}

function panel(focusable) {
  return { focus: vi.fn(), querySelector: vi.fn(() => focusable[0]), querySelectorAll: vi.fn(() => focusable) };
}

describe("modal focus management", () => {
  it("focuses a preferred confirmation input when the modal opens", () => {
    const close = element("close");
    const input = element("input");
    focusInitialModalElement(panel([close, input]), input);
    expect(input.focus).toHaveBeenCalledOnce();
    expect(close.focus).not.toHaveBeenCalled();
  });

  it("ignores normal typing keys and leaves focus in the input", () => {
    const input = element("input");
    const close = vi.fn();
    const modalPanel = panel([element("close"), input, element("cancel")]);

    for (const key of ["D", "E", "L", "T", "A", " "]) {
      const keyEvent = event(key);
      handleModalKeyDown(keyEvent, modalPanel, input, close);
      expect(keyEvent.preventDefault).not.toHaveBeenCalled();
    }

    expect(close).not.toHaveBeenCalled();
    expect(modalPanel.querySelectorAll).not.toHaveBeenCalled();
  });

  it("allows the full confirmation phrase to be typed and enables only the exact value", () => {
    const input = element("input");
    const modalPanel = panel([element("close"), input, element("confirm")]);
    let value = "";

    for (const key of "DELETE ALL TRADES") {
      handleModalKeyDown(event(key), modalPanel, input, vi.fn());
      value += key;
    }

    expect(value).toBe("DELETE ALL TRADES");
    expect(canConfirmDelete(value)).toBe(true);
    expect(canConfirmDelete("DELETE ALL TRADE")).toBe(false);
  });

  it("closes on Escape", () => {
    const close = vi.fn();
    const escapeEvent = event("Escape");
    handleModalKeyDown(escapeEvent, panel([]), element("input"), close);
    expect(escapeEvent.preventDefault).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("wraps Tab and Shift+Tab within the modal", () => {
    const first = element("close");
    const middle = element("input");
    const last = element("confirm");
    const modalPanel = panel([first, middle, last]);
    const tab = event("Tab");
    handleModalKeyDown(tab, modalPanel, last, vi.fn());
    expect(tab.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();

    const shiftTab = event("Tab", true);
    handleModalKeyDown(shiftTab, modalPanel, first, vi.fn());
    expect(shiftTab.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });
});
