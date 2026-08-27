import { supabase } from "./supabase";

export const normalizeTagName = (name) => String(name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const tableFor = (kind) => kind === "setup" ? "review_setup_tags" : "review_confluence_tags";

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You must be logged in to manage review tags.");
  return data.user.id;
}

export async function fetchReviewTags(kind) {
  const uid = await userId();
  const { data, error } = await supabase.from(tableFor(kind)).select("id,name").eq("user_id", uid).is("archived_at", null).order("name");
  if (error) throw error;
  return data || [];
}

export async function createReviewTag(kind, name) {
  const uid = await userId();
  const display = String(name || "").trim().replace(/\s+/g, " ");
  if (!display) throw new Error("Enter a tag name.");
  const normalized_name = normalizeTagName(display);
  const { data: existing } = await supabase.from(tableFor(kind)).select("id,name,archived_at").eq("user_id", uid).eq("normalized_name", normalized_name).maybeSingle();
  if (existing && !existing.archived_at) return { id: existing.id, name: existing.name };
  if (existing) {
    const { data, error } = await supabase.from(tableFor(kind)).update({ archived_at: null }).eq("id", existing.id).eq("user_id", uid).select("id,name").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from(tableFor(kind)).insert({ user_id: uid, name: display, normalized_name }).select("id,name").single();
  if (error) throw error;
  return data;
}

export async function archiveReviewTag(kind, id) {
  const uid = await userId();
  const { error } = await supabase.from(tableFor(kind)).update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", uid);
  if (error) throw error;
}
