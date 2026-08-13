import { describe, expect, it } from "vitest";
import {
  canConfirmDelete,
  deleteStateReducer,
  initialDeleteState,
} from "./deleteSettingsState";

describe("Settings delete confirmation", () => {
  it("requires the confirmation text to match exactly", () => {
    expect(canConfirmDelete("DELETE ALL TRADES")).toBe(true);
    expect(canConfirmDelete("delete all trades")).toBe(false);
    expect(canConfirmDelete("DELETE ALL TRADES ")).toBe(false);
  });

  it("cancels without starting deletion", () => {
    const open = deleteStateReducer(initialDeleteState, { type: "open" });
    expect(deleteStateReducer(open, { type: "cancel" })).toEqual(initialDeleteState);
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
