import { describe, expect, it, vi } from "vitest";
import { deleteMarketPlan } from "./marketContextService";
import { removePlanFromArchive } from "./plansArchive";

function clientFor({ plan = null, screenshotErrors = {}, user = { id: "user-1" } } = {}) {
  const selectDateEq = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: plan, error: null }) });
  const selectUserEq = vi.fn().mockReturnValue({ eq: selectDateEq });
  const deleteDateEq = vi.fn().mockResolvedValue({ error: null });
  const deleteUserEq = vi.fn().mockReturnValue({ eq: deleteDateEq });
  const select = vi.fn().mockReturnValue({ eq: selectUserEq });
  const deleteRows = vi.fn().mockReturnValue({ eq: deleteUserEq });
  const from = vi.fn((table) => { if (table !== "market_days") throw new Error(`Unexpected table ${table}`); return { select, delete: deleteRows }; });
  const remove = vi.fn(async ([path]) => ({ error: screenshotErrors[path] || null }));
  const storageFrom = vi.fn((bucket) => { if (bucket !== "market-plan-screenshots") throw new Error(`Unexpected bucket ${bucket}`); return { remove }; });
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }, from, storage: { from: storageFrom }, spies: { selectUserEq, selectDateEq, deleteUserEq, deleteDateEq, remove, from } };
}

describe("deleteMarketPlan", () => {
  it("requires an authenticated user", async () => {
    await expect(deleteMarketPlan("2026-08-11", clientFor({ user: null }))).rejects.toThrow(/logged in/);
  });

  it("removes owned QQQ/SPY screenshots and only the selected user's market day", async () => {
    const client = clientFor({ plan: { qqq_screenshot_path: "user-1/2026-08-11/qqq/a.png", spy_screenshot_path: "user-1/2026-08-11/spy/b.png" } });
    await expect(deleteMarketPlan("2026-08-11", client)).resolves.toMatchObject({ deletedPlans: 1, deletedScreenshots: 2, screenshotCleanupFailures: 0 });
    expect(client.spies.selectUserEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(client.spies.selectDateEq).toHaveBeenCalledWith("trade_date", "2026-08-11");
    expect(client.spies.deleteUserEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(client.spies.deleteDateEq).toHaveBeenCalledWith("trade_date", "2026-08-11");
    expect(client.spies.remove).toHaveBeenCalledTimes(2);
  });

  it("handles no screenshots without touching storage", async () => {
    const client = clientFor({ plan: { qqq_screenshot_path: null, spy_screenshot_path: null } });
    const result = await deleteMarketPlan("2026-08-11", client);
    expect(result.deletedScreenshots).toBe(0);
    expect(client.spies.remove).not.toHaveBeenCalled();
  });

  it("reports partial screenshot failure and still deletes the plan", async () => {
    const failed = "user-1/2026-08-11/spy/b.png";
    const client = clientFor({ plan: { qqq_screenshot_path: "user-1/2026-08-11/qqq/a.png", spy_screenshot_path: failed }, screenshotErrors: { [failed]: new Error("failed") } });
    await expect(deleteMarketPlan("2026-08-11", client)).resolves.toMatchObject({ deletedPlans: 1, deletedScreenshots: 1, screenshotCleanupFailures: 1, failedScreenshotPaths: [failed] });
    expect(client.spies.deleteDateEq).toHaveBeenCalledOnce();
  });

  it("never queries trades or daily_watchlist and ignores foreign screenshot paths", async () => {
    const client = clientFor({ plan: { qqq_screenshot_path: "other-user/date/qqq/a.png" } });
    await deleteMarketPlan("2026-08-11", client);
    expect(client.spies.from.mock.calls.map(([table]) => table)).toEqual(["market_days", "market_days"]);
    expect(client.spies.remove).not.toHaveBeenCalled();
  });

  it("removes only the deleted date from archive state; cancellation leaves state untouched", () => {
    const plans = [{ trade_date: "2026-08-11" }, { trade_date: "2026-08-10" }];
    expect(removePlanFromArchive(plans, "2026-08-11")).toEqual([{ trade_date: "2026-08-10" }]);
    expect(removePlanFromArchive(plans, null)).toEqual(plans);
  });
});
