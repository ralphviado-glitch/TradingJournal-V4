import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import SettingsPage from "./SettingsPage";
import {
  canConfirmDelete,
  deleteStateReducer,
  executeConfirmedTradeDeletion,
  initialDeleteState,
} from "./deleteSettingsState";

describe("Settings delete confirmation", () => {
  it("renders Import Preferences and the Delete All Trades danger action without a full-height nested form", () => {
    const markup = renderToStaticMarkup(createElement(SettingsPage));
    expect(markup).toContain("Import Preferences");
    expect(markup).toContain("Danger Zone");
    expect(markup).toContain("Delete All Trades");
    expect(markup).toContain('class="settings-preferences-form"');
    expect(markup).not.toContain('<form class="page-stack"');
  });

  it("requires the confirmation text to match exactly", () => {
    expect(canConfirmDelete("DELETE ALL TRADES")).toBe(true);
    expect(canConfirmDelete("delete all trades")).toBe(false);
    expect(canConfirmDelete("DELETE ALL TRADES ")).toBe(false);
  });

  it("cancels without starting deletion", () => {
    const open = deleteStateReducer(initialDeleteState, { type: "open" });
    expect(deleteStateReducer(open, { type: "cancel" })).toEqual(initialDeleteState);
  });

  it("calls the existing deletion workflow only after exact confirmation", async () => {
    const deletionWorkflow = vi.fn(async () => ({ deletedTrades: 3 }));
    await expect(executeConfirmedTradeDeletion("wrong", deletionWorkflow)).resolves.toBeNull();
    expect(deletionWorkflow).not.toHaveBeenCalled();
    await expect(executeConfirmedTradeDeletion("DELETE ALL TRADES", deletionWorkflow)).resolves.toEqual({ deletedTrades: 3 });
    expect(deletionWorkflow).toHaveBeenCalledOnce();
  });

  it("prevents cancellation or a second state transition while deleting", () => {
    const deleting = deleteStateReducer(initialDeleteState, { type: "start" });
    expect(deleteStateReducer(deleting, { type: "cancel" })).toBe(deleting);
    expect(deleteStateReducer(deleting, { type: "start" })).toBe(deleting);
  });

  it("clears deletion state and retains result counts after success", () => {
    const result = { deletedTrades: 35, deletedScreenshots: 12, screenshotCleanupFailures: 0 };
    expect(deleteStateReducer({ ...initialDeleteState, isOpen: true, isDeleting: true }, { type: "success", result }))
      .toEqual({ isOpen: false, isDeleting: false, result, error: "" });
  });
});
