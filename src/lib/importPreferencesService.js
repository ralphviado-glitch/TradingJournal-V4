import { supabase } from "./supabase";

export function normalizePreferredTtpAccount(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

async function currentUser(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You must be logged in to manage import preferences.");
  return data.user;
}

export async function fetchImportPreferences(client = supabase) {
  const user = await currentUser(client);
  const { data, error } = await client.from("import_preferences").select("preferred_ttp_account").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return { preferredTtpAccount: normalizePreferredTtpAccount(data?.preferred_ttp_account) };
}

export async function saveImportPreferences(preferences = {}, client = supabase) {
  const user = await currentUser(client);
  const preferredTtpAccount = normalizePreferredTtpAccount(preferences.preferredTtpAccount);
  const { data, error } = await client.from("import_preferences").upsert({ user_id: user.id, preferred_ttp_account: preferredTtpAccount, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("preferred_ttp_account").single();
  if (error) throw error;
  return { preferredTtpAccount: normalizePreferredTtpAccount(data.preferred_ttp_account) };
}
