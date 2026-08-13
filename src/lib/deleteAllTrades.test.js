import { describe, expect, it, vi } from "vitest";
import { deleteAllTrades } from "./tradeService";

function createClient({ trades = [], screenshotErrors = {} } = {}) {
  const selectEq = vi.fn().mockResolvedValue({ data: trades, error: null });
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const select = vi.fn(() => ({ eq: selectEq }));
  const deleteRows = vi.fn(() => ({ eq: deleteEq }));
  const from = vi.fn((table) => {
    if (table !== "trades") throw new Error(`Unexpected table: ${table}`);
    return { select, delete: deleteRows };
  });
  const remove = vi.fn(async ([path]) => ({ error: screenshotErrors[path] || null }));
  const storageFrom = vi.fn((bucket) => {
    if (bucket !== "trade-screenshots") throw new Error(`Unexpected bucket: ${bucket}`);
    return { remove };
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }) },
    from,
    storage: { from: storageFrom },
    spies: { selectEq, deleteEq, remove, from, storageFrom },
  };
}

describe("deleteAllTrades", () => {
  it("uses the authenticated user, removes owned screenshots, and deletes only that user's rows", async () => {
    const client = createClient({ trades: [
      { id: "trade-1", screenshot_path: "user-123/trade-1/a.png" },
      { id: "trade-2", screenshot_path: "user-123/trade-2/b.png" },
      { id: "trade-3", screenshot_path: null },
      { id: "trade-4", screenshot_path: "another-user/trade-4/no.png" },
    ] });

    const result = await deleteAllTrades(client);

    expect(client.auth.getUser).toHaveBeenCalledOnce();
    expect(client.spies.selectEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(client.spies.deleteEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(client.spies.remove).toHaveBeenCalledTimes(2);
    expect(client.spies.remove).toHaveBeenCalledWith(["user-123/trade-1/a.png"]);
    expect(result).toEqual({
      deletedTrades: 4,
      deletedScreenshots: 2,
      screenshotCleanupFailures: 0,
      failedScreenshotPaths: [],
    });
  });

  it("deletes a zero-trade account without touching storage", async () => {
    const client = createClient();
    await expect(deleteAllTrades(client)).resolves.toMatchObject({ deletedTrades: 0, deletedScreenshots: 0 });
    expect(client.spies.remove).not.toHaveBeenCalled();
    expect(client.spies.deleteEq).toHaveBeenCalledOnce();
  });

  it("continues deleting trade rows and reports partial screenshot cleanup failures", async () => {
    const failedPath = "user-123/trade-2/b.png";
    const client = createClient({
      trades: [
        { id: "trade-1", screenshot_path: "user-123/trade-1/a.png" },
        { id: "trade-2", screenshot_path: failedPath },
      ],
      screenshotErrors: { [failedPath]: new Error("storage unavailable") },
    });

    const result = await deleteAllTrades(client);
    expect(client.spies.deleteEq).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ deletedTrades: 2, deletedScreenshots: 1, screenshotCleanupFailures: 1 });
    expect(result.failedScreenshotPaths).toEqual([failedPath]);
  });

  it("never queries or deletes watchlists or market days", async () => {
    const client = createClient({ trades: [{ id: "trade-1", screenshot_path: null }] });
    await deleteAllTrades(client);
    expect(client.spies.from.mock.calls.map(([table]) => table)).toEqual(["trades", "trades"]);
  });
});
