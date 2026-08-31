import { supabase } from "./supabase";
import {
  getTradeScreenshotUrl,
  removeTradeScreenshot,
  uploadTradeScreenshot,
} from "./storage";
import { calculateExitEfficiency, parseExecutionNumber } from "./executionAnalysis";
import { calculatePositionPercent, deriveScaleOutFromOrders, validateTradeManagement } from "./tradeManagement";
import { deriveRoomFields, normalizeThreeState, THREE_STATE_FIELDS, validateBreakRetestReview } from "./breakRetestReview";
import { getTradeReviewCompleteness } from "./workflow/reviewCompleteness";
import { validateWorkflowStatuses } from "./workflow/workflowStatus";
import { applyFees } from "./tradePnl";

const executionAnalysisFields = [
  "planned_entry",
  "planned_stop",
  "planned_target",
  "planned_risk",
  "actual_entry",
  "actual_stop",
  "actual_exit",
  "actual_risk",
  "mfe",
  "mae",
  "exit_efficiency",
  "mfe_per_share",
  "mae_per_share",
  "mfe_dollars",
  "mae_dollars",
  "mfe_r",
  "mae_r",
  "highest_price_during_trade",
  "lowest_price_during_trade",
  "excursion_calculated_at",
];

const executionTimestampFields = new Set(["excursion_calculated_at"]);

const tradeManagementNumberFields = [
  "execution_score",
  "first_scale_price",
  "first_scale_shares",
  "first_scale_percent",
  "runner_exit_price",
  "runner_shares",
  "runner_percent",
  "planned_first_scale_price",
  "planned_first_scale_percent",
  "planned_runner_target",
  "planned_runner_percent",
];

const tradeManagementTextFields = [
  "setup_quality",
  "execution_quality",
  "management_notes",
];

const actualManagementFields = [
  "first_scale_price", "first_scale_shares", "first_scale_percent",
  "runner_exit_price", "runner_shares", "runner_percent",
];

const breakRetestNumberFields = ["break_level_price", "next_level_price", "distance_to_next_level", "distance_to_next_level_r", "rule_adherence_score"];
const breakRetestTextFields = ["break_direction", "break_level_type", "displacement_quality", "retest_quality", "qqq_alignment", "spy_alignment", "market_alignment", "entry_trigger", "entry_confirmation", "setup_review_notes"];
const workflowTextFields = ["processing_status", "excursion_status", "management_status", "watchlist_match_status", "review_status", "planned_direction", "planned_setup", "planned_key_levels", "planned_notes", "processing_error", "planned_overall_rating", "planned_weekly_bias", "planned_intraday_bias", "planned_relative_strength", "planned_confidence", "planned_long_trigger", "planned_long_setup", "planned_long_target", "planned_long_invalidation", "planned_short_trigger", "planned_short_setup", "planned_short_target", "planned_short_invalidation", "planned_bottom_line", "plan_direction_classification"];
const workflowNumberFields = ["watchlist_rank"];
const workflowBooleanFields = ["planned_trade", "direction_matched", "preferred_direction_matched", "planned_scenario_matched", "planned_long_scenario_enabled", "planned_short_scenario_enabled"];
const quickReviewTextFields = ["review_note", "setup_grade", "execution_grade", "final_grade", "outcome_classification", "grade_explanation", "grading_version", "review_status"];
const quickReviewJsonFields = ["quick_review_sequence", "quick_review_context", "quick_review_execution"];

async function getCurrentUser(client = supabase) {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("You must be logged in to access trades.");
  }

  return userData.user;
}

function getOwnedScreenshotPaths(rows, userId) {
  return [...new Set(
    (rows || [])
      .map((row) => row.screenshot_path?.trim())
      .filter((path) => path && path.startsWith(`${userId}/`) && !path.includes(".."))
  )];
}

export async function deleteAllTrades(client = supabase) {
  const user = await getCurrentUser(client);
  const { data: trades, error: fetchError } = await client
    .from("trades")
    .select("id,screenshot_path")
    .eq("user_id", user.id);

  if (fetchError) throw fetchError;

  const screenshotPaths = getOwnedScreenshotPaths(trades, user.id);
  const failedScreenshotPaths = [];
  let deletedScreenshots = 0;

  for (const path of screenshotPaths) {
    const { error } = await client.storage
      .from("trade-screenshots")
      .remove([path]);

    if (error) failedScreenshotPaths.push(path);
    else deletedScreenshots += 1;
  }

  const { error: deleteError } = await client
    .from("trades")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) throw deleteError;

  return {
    deletedTrades: (trades || []).length,
    deletedScreenshots,
    screenshotCleanupFailures: failedScreenshotPaths.length,
    failedScreenshotPaths,
  };
}

async function mapTradeRow(row) {
  const screenshotReference =
    row.screenshot_path || row.screenshot_url || row.screenshot || "";
  let screenshot = "";

  try {
    screenshot = await getTradeScreenshotUrl(screenshotReference);
  } catch (error) {
    console.warn("Failed to create signed screenshot URL:", error);
  }

  const derivedManagement = deriveScaleOutFromOrders(row);
  const hasSavedManagement = actualManagementFields.some((field) => row[field] != null);
  const matchesImportedOrders = derivedManagement && actualManagementFields.every(
    (field) => row[field] == null || Number(row[field]) === Number(derivedManagement[field])
  );

  return {
    ...row,
    ...(!hasSavedManagement && derivedManagement ? derivedManagement : {}),
    scaleOutSource: matchesImportedOrders ? "imported_orders" : hasSavedManagement ? "manual" : derivedManagement ? "imported_orders" : null,
    date: row.trade_date,
    mistakeTags: row.mistake_tags || row.mistakeTags || [],
    emotionTags: row.emotion_tags || row.emotionTags || [],
    rulesFollowed: row.rules_followed ?? row.rulesFollowed ?? null,
    screenshotPath: row.screenshot_path || "",
    screenshotUrl: row.screenshot_url || "",
    screenshot,
  };
}

export async function fetchTrades() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("trade_date", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = await Promise.all((data || []).map(mapTradeRow));
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const [{ data: setups, error: setupError }, { data: confluences, error: confluenceError }] = await Promise.all([
    supabase.from("trade_setup_tags").select("trade_id,tag_id,review_setup_tags(name)").eq("user_id", user.id).in("trade_id", ids),
    supabase.from("trade_confluence_tags").select("trade_id,tag_id,review_confluence_tags(name)").eq("user_id", user.id).in("trade_id", ids),
  ]);
  if (setupError) throw setupError;
  if (confluenceError) throw confluenceError;
  return rows.map((row) => ({ ...row,
    setupTags: (setups || []).filter((link) => link.trade_id === row.id).map((link) => ({ id: link.tag_id, name: link.review_setup_tags?.name })).filter((tag) => tag.name),
    confluenceTags: (confluences || []).filter((link) => link.trade_id === row.id).map((link) => ({ id: link.tag_id, name: link.review_confluence_tags?.name })).filter((tag) => tag.name),
  }));
}

// Trade screenshots share the existing private bucket and user/trade folder layout.
// The folder is the association, so historical singular screenshot_path rows and
// newly uploaded multiple screenshots can be presented together without schema changes.
export async function fetchTradeScreenshots(tradeId) {
  const user = await getCurrentUser();
  const folder = `${user.id}/${tradeId}`;
  const { data, error } = await supabase.storage.from("trade-screenshots").list(folder, {
    limit: 100,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error) throw error;
  return Promise.all((data || []).filter((item) => item.name && item.id).map(async (item) => {
    const path = `${folder}/${item.name}`;
    return { path, url: await getTradeScreenshotUrl(path), name: item.name };
  }));
}

export async function addTradeScreenshot(tradeId, file) {
  const user = await getCurrentUser();
  const path = await uploadTradeScreenshot(file, user.id, tradeId);
  const { data: trade, error: fetchError } = await supabase.from("trades").select("screenshot_path").eq("id", tradeId).eq("user_id", user.id).single();
  if (fetchError) console.warn("Screenshot uploaded, but primary screenshot pointer could not be read:", fetchError);
  if (trade && !trade.screenshot_path) {
    const { error } = await supabase.from("trades").update({ screenshot_path: path, screenshot_url: null, updated_at: new Date().toISOString() }).eq("id", tradeId).eq("user_id", user.id);
    // Keep the successfully uploaded object: folder discovery means it remains
    // attached even if this compatibility pointer cannot be updated.
    if (error) console.warn("Screenshot uploaded, but primary screenshot pointer was not updated:", error);
  }
  return { path, url: await getTradeScreenshotUrl(path), name: file.name };
}

export async function deleteTradeScreenshot(tradeId, path) {
  const user = await getCurrentUser();
  const ownedPrefix = `${user.id}/${tradeId}/`;
  const legacyReference = /^https?:\/\//i.test(path || "") || String(path || "").startsWith("data:image/");
  if (!legacyReference && (!path?.startsWith(ownedPrefix) || path.includes(".."))) throw new Error("Invalid screenshot path.");
  const { data: trade, error: fetchError } = await supabase.from("trades").select("screenshot_path,screenshot_url").eq("id", tradeId).eq("user_id", user.id).single();
  if (fetchError) throw fetchError;
  if (legacyReference) {
    const payload = {};
    if (trade.screenshot_path === path) payload.screenshot_path = null;
    if (trade.screenshot_url === path) payload.screenshot_url = null;
    if (!Object.keys(payload).length) throw new Error("Screenshot is not associated with this trade.");
    const { error } = await supabase.from("trades").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", tradeId).eq("user_id", user.id);
    if (error) throw error;
    return;
  }
  await removeTradeScreenshot(path);
  if (trade.screenshot_path === path) {
    const remaining = await fetchTradeScreenshots(tradeId);
    const { error } = await supabase.from("trades").update({ screenshot_path: remaining[0]?.path || null, screenshot_url: null, updated_at: new Date().toISOString() }).eq("id", tradeId).eq("user_id", user.id);
    if (error) throw error;
  }
}

function normalizeDuplicateValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number(value).toString();
  }

  return String(value).trim();
}

function normalizeDuplicateNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return Number(value).toString();
}

export function getTradeDuplicateKey(trade) {
  return [
    normalizeDuplicateValue(trade.user_id),
    normalizeDuplicateValue(trade.trade_date || trade.date),
    normalizeDuplicateValue(trade.ticker).toUpperCase(),
    normalizeDuplicateValue(trade.direction).toLowerCase(),
    normalizeDuplicateValue(trade.entry_time),
    normalizeDuplicateValue(trade.exit_time),
    normalizeDuplicateNumber(trade.entry_price),
    normalizeDuplicateNumber(trade.exit_price),
    normalizeDuplicateNumber(trade.shares),
  ].join("|");
}

export function filterDuplicateTradesForImport(candidateTrades = [], existingTrades = []) {
  const seenKeys = new Set(existingTrades.map(getTradeDuplicateKey));
  const newTrades = [];
  let skippedDuplicates = 0;

  candidateTrades.forEach((trade) => {
    const key = getTradeDuplicateKey(trade);

    if (seenKeys.has(key)) {
      skippedDuplicates += 1;
      return;
    }

    seenKeys.add(key);
    newTrades.push(trade);
  });

  return {
    newTrades,
    skippedDuplicates,
  };
}

export function mapTradeToInsertRow(trade, userId) {
  const derivedManagement = deriveScaleOutFromOrders(trade);
  const row = {
    user_id: userId,
    trade_date: trade.date,
    ticker: trade.ticker,
    direction: trade.direction,
    entry_time: trade.entry_time || "",
    exit_time: trade.exit_time || "",
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    shares: trade.shares,
    pnl: trade.pnl,
    gross_pnl: trade.gross_pnl ?? null,
    fees: trade.fees ?? null,
    net_pnl: trade.net_pnl ?? null,
    pnl_source: trade.pnl_source || null,
    risk: trade.risk || 0,
    setup: trade.setup || "Unclassified",
    notes: trade.notes || "",
    grade: trade.grade || "",
    mistake_tags: trade.mistakeTags || [],
    emotion_tags: trade.emotionTags || [],
    rules_followed: trade.rulesFollowed ?? null,
    orders: trade.orders || [],
    screenshot_path: trade.screenshotPath || "",
    screenshot_url: trade.screenshotUrl || "",
    ...derivedManagement,
  };

  executionAnalysisFields.forEach((field) => {
    if (field in trade) {
      row[field] = executionTimestampFields.has(field)
        ? trade[field] || null
        : parseExecutionNumber(trade[field]);
    }
  });

  tradeManagementNumberFields.forEach((field) => {
    if (field in trade) row[field] = parseExecutionNumber(trade[field]);
  });
  tradeManagementTextFields.forEach((field) => {
    if (field in trade) row[field] = trade[field] || null;
  });
  THREE_STATE_FIELDS.forEach((field) => {
    if (field in trade) row[field] = normalizeThreeState(trade[field]);
  });
  breakRetestNumberFields.forEach((field) => {
    if (field in trade) row[field] = parseExecutionNumber(trade[field]);
  });
  breakRetestTextFields.forEach((field) => {
    if (field in trade) row[field] = trade[field] || null;
  });
  if ("rule_violations" in trade) row.rule_violations = trade.rule_violations || [];
  workflowTextFields.forEach((field) => { if (field in trade) row[field] = trade[field] || null; });
  workflowNumberFields.forEach((field) => { if (field in trade) row[field] = parseExecutionNumber(trade[field]); });
  workflowBooleanFields.forEach((field) => { if (field in trade) row[field] = trade[field] == null ? null : Boolean(trade[field]); });
  if ("watchlist_item_id" in trade) row.watchlist_item_id = trade.watchlist_item_id || null;
  if ("review_completed_at" in trade) row.review_completed_at = trade.review_completed_at || null;
  quickReviewTextFields.forEach((field) => { if (field in trade) row[field] = trade[field] || null; });
  quickReviewJsonFields.forEach((field) => { if (field in trade) row[field] = trade[field] || null; });
  if ("quick_review_completed_at" in trade) row.quick_review_completed_at = trade.quick_review_completed_at || null;
  if (row.next_level_price != null) Object.assign(row, deriveRoomFields(row));

  return row;
}

async function fetchExistingTradesForDuplicateCheck(userId, rows) {
  const tradeDates = [...new Set(rows.map((trade) => trade.trade_date).filter(Boolean))];

  if (tradeDates.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("trades")
    .select(
      "user_id,trade_date,ticker,direction,entry_time,exit_time,entry_price,exit_price,shares"
    )
    .eq("user_id", userId)
    .in("trade_date", tradeDates);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function insertTrades(trades = []) {
  const user = await getCurrentUser();
  const rows = trades.map((trade) => mapTradeToInsertRow(trade, user.id));
  const existingTrades = await fetchExistingTradesForDuplicateCheck(user.id, rows);
  const { newTrades, skippedDuplicates } = filterDuplicateTradesForImport(
    rows,
    existingTrades
  );

  if (newTrades.length === 0) {
    return {
      trades: [],
      importedCount: 0,
      skippedDuplicates,
    };
  }

  const { data, error } = await supabase
    .from("trades")
    .insert(newTrades)
    .select();

  if (error) {
    throw error;
  }

  const insertedTrades = await Promise.all((data || []).map(mapTradeRow));

  return {
    trades: insertedTrades,
    importedCount: insertedTrades.length,
    skippedDuplicates,
  };
}

export function buildTradeUpdatePayload(updates = {}) {
  validateTradeManagement(updates);
  validateBreakRetestReview(updates);
  validateWorkflowStatuses(updates);
  const payload = {};

  if ("setup" in updates) payload.setup = updates.setup || "Unclassified";
  if ("notes" in updates) payload.notes = updates.notes || "";
  if ("grade" in updates) payload.grade = updates.grade || "";
  if ("mistakeTags" in updates) payload.mistake_tags = updates.mistakeTags || [];
  if ("emotionTags" in updates) payload.emotion_tags = updates.emotionTags || [];
  if ("rulesFollowed" in updates) payload.rules_followed = updates.rulesFollowed === true || updates.rulesFollowed === "true" ? true : updates.rulesFollowed === false || updates.rulesFollowed === "false" ? false : null;
  if ("screenshotPath" in updates) payload.screenshot_path = updates.screenshotPath || null;
  if ("screenshotUrl" in updates) payload.screenshot_url = updates.screenshotUrl || null;
  if ("gross_pnl" in updates) payload.gross_pnl = parseExecutionNumber(updates.gross_pnl);
  if ("fees" in updates) payload.fees = parseExecutionNumber(updates.fees);
  if ("net_pnl" in updates) payload.net_pnl = parseExecutionNumber(updates.net_pnl);
  if ("pnl" in updates) payload.pnl = parseExecutionNumber(updates.pnl);
  if ("pnl_source" in updates) payload.pnl_source = updates.pnl_source || null;

  executionAnalysisFields.forEach((field) => {
    if (field in updates) {
      payload[field] = executionTimestampFields.has(field)
        ? updates[field] || null
        : parseExecutionNumber(updates[field]);
    }
  });

  tradeManagementNumberFields.forEach((field) => {
    if (field in updates) payload[field] = parseExecutionNumber(updates[field]);
  });
  tradeManagementTextFields.forEach((field) => {
    if (field in updates) payload[field] = updates[field] || null;
  });
  THREE_STATE_FIELDS.forEach((field) => {
    if (field in updates) payload[field] = normalizeThreeState(updates[field]);
  });
  breakRetestNumberFields.forEach((field) => {
    if (field in updates) payload[field] = parseExecutionNumber(updates[field]);
  });
  breakRetestTextFields.forEach((field) => {
    if (field in updates) payload[field] = updates[field] || null;
  });
  if ("rule_violations" in updates) payload.rule_violations = updates.rule_violations;
  workflowTextFields.forEach((field) => { if (field in updates) payload[field] = updates[field] || null; });
  workflowNumberFields.forEach((field) => { if (field in updates) payload[field] = parseExecutionNumber(updates[field]); });
  workflowBooleanFields.forEach((field) => { if (field in updates) payload[field] = updates[field] == null ? null : Boolean(updates[field]); });
  if ("watchlist_item_id" in updates) payload.watchlist_item_id = updates.watchlist_item_id || null;
  if ("review_completed_at" in updates) payload.review_completed_at = updates.review_completed_at || null;
  quickReviewTextFields.forEach((field) => { if (field in updates) payload[field] = updates[field] || null; });
  quickReviewJsonFields.forEach((field) => { if (field in updates) payload[field] = updates[field] || null; });
  if ("quick_review_completed_at" in updates) payload.quick_review_completed_at = updates.quick_review_completed_at || null;

  payload.updated_at = new Date().toISOString();

  return payload;
}

export async function updateTrade(tradeId, updates = {}) {
  const user = await getCurrentUser();
  let uploadedPath = "";

  const { data: existingTrade, error: fetchError } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const normalizedUpdates = { ...updates };
  if ("fees" in updates) Object.assign(normalizedUpdates, applyFees(existingTrade, updates.fees));
  if ("first_scale_shares" in updates) {
    normalizedUpdates.first_scale_percent = calculatePositionPercent(updates.first_scale_shares, existingTrade.shares);
  }
  if ("runner_shares" in updates) {
    normalizedUpdates.runner_percent = calculatePositionPercent(updates.runner_shares, existingTrade.shares);
  }
  if (["next_level_price", "actual_stop", "planned_stop"].some((field) => field in updates)) {
    Object.assign(normalizedUpdates, deriveRoomFields({ ...existingTrade, ...normalizedUpdates }));
  }
  const review = getTradeReviewCompleteness({ ...existingTrade, ...normalizedUpdates });
  normalizedUpdates.review_status = normalizedUpdates.review_status || review.status;
  normalizedUpdates.review_completed_at = normalizedUpdates.review_status === "Reviewed" || normalizedUpdates.review_status === "Review Complete"
    ? existingTrade.review_completed_at || new Date().toISOString()
    : null;
  const payload = buildTradeUpdatePayload(normalizedUpdates);

  if ("mfe" in updates && !("exit_efficiency" in updates)) {
    payload.exit_efficiency = calculateExitEfficiency({
      realizedProfit: existingTrade.pnl,
      mfe: updates.mfe,
    });
  }

  if (updates.screenshotFile && !updates.removeScreenshot) {
    uploadedPath = await uploadTradeScreenshot(updates.screenshotFile, user.id, tradeId);
    payload.screenshot_path = uploadedPath;
    payload.screenshot_url = null;
  }

  if (updates.removeScreenshot) {
    payload.screenshot_path = null;
    payload.screenshot_url = null;
  }

  const { data, error } = await supabase
    .from("trades")
    .update(payload)
    .eq("id", tradeId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (uploadedPath) {
      await removeTradeScreenshot(uploadedPath).catch((cleanupError) => {
        console.warn("Failed to remove screenshot after trade update failed:", cleanupError);
      });
    }

    throw error;
  }

  async function replaceTagLinks(table, tagIds) {
    if (!Array.isArray(tagIds)) return;
    const { error: removeError } = await supabase.from(table).delete().eq("trade_id", tradeId).eq("user_id", user.id);
    if (removeError) throw removeError;
    if (tagIds.length) {
      const { error: insertError } = await supabase.from(table).insert(tagIds.map((tagId) => ({ trade_id: tradeId, tag_id: tagId, user_id: user.id })));
      if (insertError) throw insertError;
    }
  }
  await replaceTagLinks("trade_setup_tags", updates.setup_tag_ids);
  await replaceTagLinks("trade_confluence_tags", updates.confluence_tag_ids);

  const previousPath = existingTrade.screenshot_path;
  if ((uploadedPath || updates.removeScreenshot) && previousPath && previousPath !== uploadedPath) {
    await removeTradeScreenshot(previousPath).catch((cleanupError) => {
      console.warn("Failed to remove replaced screenshot:", cleanupError);
    });
  }

  const mapped = await mapTradeRow(data);
  return { ...mapped,
    setupTags: Array.isArray(updates.setup_tag_ids) ? (updates.setup_tags || []) : undefined,
    confluenceTags: Array.isArray(updates.confluence_tag_ids) ? (updates.confluence_tags || []) : undefined,
  };
}

export async function deleteTrade(tradeId) {
  const user = await getCurrentUser();

  const { data: existingTrade, error: fetchError } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  if (existingTrade.screenshot_path) {
    await removeTradeScreenshot(existingTrade.screenshot_path).catch((cleanupError) => {
      console.warn("Trade deleted, but screenshot cleanup failed:", cleanupError);
    });
  }
}
