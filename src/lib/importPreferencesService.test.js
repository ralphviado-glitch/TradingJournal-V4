import { describe, expect, it, vi } from "vitest";
import { fetchImportPreferences, normalizePreferredTtpAccount, saveImportPreferences } from "./importPreferencesService";

function client(result) {
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => result), upsert: vi.fn(() => chain), single: vi.fn(async () => result) };
  return { auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })) }, from: vi.fn(() => chain), chain };
}

describe("import preferences persistence", () => {
  it("trims account IDs and persists them for the authenticated user", async () => {
    const mock = client({ data: { preferred_ttp_account: "FLEX5013084227" }, error: null });
    expect(await saveImportPreferences({ preferredTtpAccount: "  FLEX5013084227  " }, mock)).toEqual({ preferredTtpAccount: "FLEX5013084227" });
    expect(mock.chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", preferred_ttp_account: "FLEX5013084227" }), { onConflict: "user_id" });
  });
  it("loads a server-side preference and normalizes blank values", async () => {
    const mock = client({ data: { preferred_ttp_account: " ACCOUNT-2 " }, error: null });
    expect(await fetchImportPreferences(mock)).toEqual({ preferredTtpAccount: "ACCOUNT-2" });
    expect(normalizePreferredTtpAccount("   ")).toBeNull();
  });
});
