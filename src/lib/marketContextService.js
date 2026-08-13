import { supabase } from "./supabase";
import { getMarketPlanScreenshotUrl, removeMarketPlanScreenshot, uploadMarketPlanScreenshot } from "./storage";

async function mapMarketDay(row) {
  const [qqqScreenshot, spyScreenshot] = await Promise.all([
    getMarketPlanScreenshotUrl(row.qqq_screenshot_path || "").catch(() => ""),
    getMarketPlanScreenshotUrl(row.spy_screenshot_path || "").catch(() => ""),
  ]);
  return { ...row, qqqScreenshot, spyScreenshot };
}

async function getCurrentUser() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("You must be logged in to access market context.");
  }

  return userData.user;
}

export async function fetchMarketDays() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("market_days")
    .select("*")
    .eq("user_id", user.id)
    .order("trade_date", { ascending: true });

  if (error) {
    throw error;
  }

  return Promise.all((data || []).map(mapMarketDay));
}

export async function fetchMarketDayForDate(date) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("market_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("trade_date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMarketDay(data) : null;
}

export function buildMarketDayRow(marketDay, userId) {
  return {
    user_id: userId,
    trade_date: marketDay.trade_date,
    market_condition: marketDay.market_condition,
    spy_bias: marketDay.spy_bias,
    spy_pdh: marketDay.spy_pdh || null,
    spy_pdl: marketDay.spy_pdl || null,
    spy_pmh: marketDay.spy_pmh || null,
    spy_pml: marketDay.spy_pml || null,
    spy_liquidity_target: marketDay.spy_liquidity_target || "",
    qqq_bias: marketDay.qqq_bias,
    qqq_pdh: marketDay.qqq_pdh || null,
    qqq_pdl: marketDay.qqq_pdl || null,
    qqq_pmh: marketDay.qqq_pmh || null,
    qqq_pml: marketDay.qqq_pml || null,
    qqq_liquidity_target: marketDay.qqq_liquidity_target || "",
    event_type: marketDay.event_type || "",
    event_name: marketDay.event_name || "",
    notes: marketDay.notes || "",
    reflection_well: marketDay.reflection_well || null,
    reflection_weakness: marketDay.reflection_weakness || null,
    reflection_focus: marketDay.reflection_focus || null,
    reflection_notes: marketDay.reflection_notes || null,
    trading_day_completed_at: marketDay.trading_day_completed_at || null,
    expected_trading_day: marketDay.expected_trading_day || null,
    qqq_weekly_bias: marketDay.qqq_weekly_bias || null,
    qqq_daily_bias: marketDay.qqq_daily_bias || null,
    qqq_intraday_bias: marketDay.qqq_intraday_bias || null,
    qqq_market_environment: marketDay.qqq_market_environment || null,
    qqq_bull_trigger: marketDay.qqq_bull_trigger || null,
    qqq_bear_trigger: marketDay.qqq_bear_trigger || null,
    qqq_most_important_level: marketDay.qqq_most_important_level || null,
    qqq_game_plan: marketDay.qqq_game_plan || null,
    qqq_screenshot_path: marketDay.qqq_screenshot_path || null,
    spy_weekly_bias: marketDay.spy_weekly_bias || null,
    spy_daily_bias: marketDay.spy_daily_bias || null,
    spy_intraday_bias: marketDay.spy_intraday_bias || null,
    spy_market_environment: marketDay.spy_market_environment || null,
    spy_bull_trigger: marketDay.spy_bull_trigger || null,
    spy_bear_trigger: marketDay.spy_bear_trigger || null,
    spy_most_important_level: marketDay.spy_most_important_level || null,
    spy_game_plan: marketDay.spy_game_plan || null,
    spy_screenshot_path: marketDay.spy_screenshot_path || null,
  };
}

export async function upsertMarketDay(marketDay) {
  const user = await getCurrentUser();
  const row = buildMarketDayRow(marketDay, user.id);
  const replacements = [];
  for (const symbol of ["qqq", "spy"]) {
    const file = marketDay[`${symbol}ScreenshotFile`];
    const remove = marketDay[`remove${symbol.toUpperCase()}Screenshot`];
    const previous = marketDay[`${symbol}_screenshot_path`];
    if (file) row[`${symbol}_screenshot_path`] = await uploadMarketPlanScreenshot(file, user.id, marketDay.trade_date, symbol);
    else if (remove) row[`${symbol}_screenshot_path`] = null;
    if ((file || remove) && previous) replacements.push(previous);
  }

  const { data, error } = await supabase
    .from("market_days")
    .upsert(row, {
      onConflict: "user_id,trade_date",
    })
    .select()
    .single();

  if (error) {
    for (const symbol of ["qqq", "spy"]) {
      const uploaded = row[`${symbol}_screenshot_path`];
      if (marketDay[`${symbol}ScreenshotFile`] && uploaded) await removeMarketPlanScreenshot(uploaded).catch(() => {});
    }
    throw error;
  }

  await Promise.all(replacements.map((path) => removeMarketPlanScreenshot(path).catch(() => {})));

  return mapMarketDay(data);
}

export async function deleteMarketPlan(tradeDate, client = supabase) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("You must be logged in to delete a pre-market plan.");

  const { data: plan, error: fetchError } = await client.from("market_days")
    .select("qqq_screenshot_path,spy_screenshot_path")
    .eq("user_id", user.id).eq("trade_date", tradeDate).maybeSingle();
  if (fetchError) throw fetchError;
  if (!plan) return { deletedPlans: 0, deletedScreenshots: 0, screenshotCleanupFailures: 0, failedScreenshotPaths: [] };

  const paths = [...new Set([plan.qqq_screenshot_path, plan.spy_screenshot_path]
    .filter((path) => typeof path === "string" && path.startsWith(`${user.id}/`) && !path.includes("..")))];
  const failedScreenshotPaths = [];
  let deletedScreenshots = 0;
  for (const path of paths) {
    const { error } = await client.storage.from("market-plan-screenshots").remove([path]);
    if (error) failedScreenshotPaths.push(path); else deletedScreenshots += 1;
  }

  const { error: deleteError } = await client.from("market_days").delete()
    .eq("user_id", user.id).eq("trade_date", tradeDate);
  if (deleteError) throw deleteError;
  return { deletedPlans: 1, deletedScreenshots, screenshotCleanupFailures: failedScreenshotPaths.length, failedScreenshotPaths };
}
