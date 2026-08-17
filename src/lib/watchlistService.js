import { supabase } from "./supabase";
import {
  parseNullablePrice,
  sortWatchlistByPriority,
  structuredLevelFields,
} from "./watchlistUtils";
import {
  getWatchlistScreenshotUrl,
  removeWatchlistScreenshot,
  uploadWatchlistScreenshot,
} from "./storage";

export const dualScenarioTextFields = ["overall_rating", "weekly_bias", "daily_bias", "intraday_bias", "relative_strength", "confidence", "long_trigger", "long_setup", "long_target", "long_invalidation", "short_trigger", "short_setup", "short_target", "short_invalidation", "bottom_line"];
export const dualScenarioBooleanFields = ["long_scenario_enabled", "short_scenario_enabled"];

async function getCurrentUser() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("You must be logged in to access your watchlist.");
  }

  return userData.user;
}

export async function getWatchlistForDate(date) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("daily_watchlist")
    .select("*")
    .eq("user_id", user.id)
    .eq("trade_date", date)
    .order("priority", { ascending: true });

  if (error) {
    throw error;
  }

  return sortWatchlistByPriority(await Promise.all((data || []).map(mapWatchlistRow)));
}

export async function getWatchlistForDates(dates = []) {
  const user = await getCurrentUser();
  const uniqueDates = [...new Set(dates.filter(Boolean))];
  if (!uniqueDates.length) return [];
  const { data, error } = await supabase.from("daily_watchlist").select("*").eq("user_id", user.id).in("trade_date", uniqueDates).order("priority", { ascending: true });
  if (error) throw error;
  return Promise.all((data || []).map(mapWatchlistRow));
}

async function mapWatchlistRow(row) {
  let screenshot = "";

  try {
    screenshot = await getWatchlistScreenshotUrl(row.screenshot_path || "");
  } catch (error) {
    console.warn("Failed to create signed watchlist screenshot URL:", error);
  }

  return {
    ...row,
    screenshot,
    screenshotPath: row.screenshot_path || "",
  };
}

export function buildWatchlistPayload(item, userId) {
  const row = {
    user_id: userId,
    trade_date: item.trade_date,
    ticker: String(item.ticker || "").trim().toUpperCase(),
    direction: item.direction || "Neutral",
    priority: Number(item.priority || 1),
    setup: item.setup || "",
    key_levels: item.key_levels || "",
    notes: item.notes || "",
  };

  structuredLevelFields.forEach((field) => {
    if (field in item) {
      row[field] = parseNullablePrice(item[field]);
    }
  });

  if ("screenshotPath" in item) row.screenshot_path = item.screenshotPath || null;
  if ("screenshot_path" in item) row.screenshot_path = item.screenshot_path || null;
  dualScenarioTextFields.forEach((field) => { if (field in item) row[field] = item[field] || null; });
  dualScenarioBooleanFields.forEach((field) => { if (field in item) row[field] = item[field] == null ? null : Boolean(item[field]); });

  if (userId) {
    row.user_id = userId;
  }

  return row;
}

export function buildWatchlistUpdatePayload(updates) {
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if ("ticker" in updates) payload.ticker = String(updates.ticker || "").trim().toUpperCase();
  if ("direction" in updates) payload.direction = updates.direction || "Neutral";
  if ("priority" in updates) payload.priority = Number(updates.priority || 1);
  if ("setup" in updates) payload.setup = updates.setup || "";
  if ("key_levels" in updates) payload.key_levels = updates.key_levels || "";
  if ("notes" in updates) payload.notes = updates.notes || "";
  dualScenarioTextFields.forEach((field) => { if (field in updates) payload[field] = updates[field] || null; });
  dualScenarioBooleanFields.forEach((field) => { if (field in updates) payload[field] = updates[field] == null ? null : Boolean(updates[field]); });

  structuredLevelFields.forEach((field) => {
    if (field in updates) {
      payload[field] = parseNullablePrice(updates[field]);
    }
  });

  return payload;
}

export async function createWatchlistItem(item) {
  const user = await getCurrentUser();
  const row = buildWatchlistPayload(item, user.id);

  const { data, error } = await supabase
    .from("daily_watchlist")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw error;
  }

  let uploadedPath = "";

  if (item.screenshotFile) {
    try {
      uploadedPath = await uploadWatchlistScreenshot(item.screenshotFile, user.id, data.id);

      const { data: updatedData, error: updateError } = await supabase
        .from("daily_watchlist")
        .update({
          screenshot_path: uploadedPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return mapWatchlistRow(updatedData);
    } catch (screenshotError) {
      if (uploadedPath) {
        await removeWatchlistScreenshot(uploadedPath).catch((cleanupError) => {
          console.warn("Failed to remove watchlist screenshot after create failed:", cleanupError);
        });
      }

      throw screenshotError;
    }
  }

  return mapWatchlistRow(data);
}

export async function updateWatchlistItem(id, updates) {
  const user = await getCurrentUser();
  let uploadedPath = "";

  const { data: existingItem, error: fetchError } = await supabase
    .from("daily_watchlist")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const payload = buildWatchlistUpdatePayload(updates);

  if (updates.screenshotFile && !updates.removeScreenshot) {
    uploadedPath = await uploadWatchlistScreenshot(updates.screenshotFile, user.id, id);
    payload.screenshot_path = uploadedPath;
  }

  if (updates.removeScreenshot) {
    payload.screenshot_path = null;
  }

  const { data, error } = await supabase
    .from("daily_watchlist")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (uploadedPath) {
      await removeWatchlistScreenshot(uploadedPath).catch((cleanupError) => {
        console.warn("Failed to remove watchlist screenshot after update failed:", cleanupError);
      });
    }

    throw error;
  }

  const previousPath = existingItem.screenshot_path;
  if ((uploadedPath || updates.removeScreenshot) && previousPath && previousPath !== uploadedPath) {
    await removeWatchlistScreenshot(previousPath).catch((cleanupError) => {
      console.warn("Failed to remove replaced watchlist screenshot:", cleanupError);
    });
  }

  return mapWatchlistRow(data);
}

export async function deleteWatchlistItem(id) {
  const user = await getCurrentUser();

  const { data: existingItem, error: fetchError } = await supabase
    .from("daily_watchlist")
    .select("screenshot_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const { error } = await supabase
    .from("daily_watchlist")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  if (existingItem.screenshot_path) {
    await removeWatchlistScreenshot(existingItem.screenshot_path).catch((cleanupError) => {
      console.warn("Watchlist item deleted, but screenshot cleanup failed:", cleanupError);
    });
  }
}
