import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration014 = readFileSync(new URL("../../supabase/migrations/202608170014_ai_premarket_plan.sql", import.meta.url), "utf8");
const migration015 = readFileSync(new URL("../../supabase/migrations/202608170015_chatgpt_premarket_import.sql", import.meta.url), "utf8");
const migration016 = readFileSync(new URL("../../supabase/migrations/202608170016_simplified_premarket_plan.sql", import.meta.url), "utf8");

describe("V1.2.1 additive migration", () => {
  it("keeps deployed migration 014 in its original pre-V1.2.1 shape", () => {
    expect(migration014).not.toContain("chatgpt_manual_import");
    expect(migration014).not.toContain("premarket_data_included");
    expect(migration014).toContain("'ai_assisted'");
  });

  it("uses 015 only for additive schema and RPC corrections", () => {
    expect(migration015).toContain("add column if not exists premarket_data_included");
    expect(migration015).toContain("chatgpt_manual_import");
    expect(migration015).toContain("nullif(p_metadata->>'ai_model','')");
    expect(migration015).not.toMatch(/create\s+table/i);
  });

  it("preserves market and watchlist PMH/PML on omitted import values", () => {
    expect(migration015).toContain("qqq_pmh=coalesce(excluded.qqq_pmh, market_days.qqq_pmh)");
    expect(migration015).toContain("spy_pml=coalesce(excluded.spy_pml, market_days.spy_pml)");
    expect(migration015).toContain("pmh=coalesce(nullif(v_item->>'pmh','')::numeric,pmh)");
    expect(migration015).toContain("pml=coalesce(nullif(v_item->>'pml','')::numeric,pml)");
  });

  it("retains authenticated transactional merge behavior without event updates or row deletion", () => {
    expect(migration015).toContain("v_user_id uuid := auth.uid()");
    expect(migration015).toContain("security invoker");
    expect(migration015).toContain("where user_id=v_user_id and trade_date=p_trade_date");
    expect(migration015).not.toMatch(/event_type\s*=|event_name\s*=/i);
    expect(migration015).not.toMatch(/delete\s+from\s+public\.daily_watchlist/i);
    expect(migration015).not.toContain("public.trades");
  });

  it("updates matching batch tickers and inserts missing tickers without touching unrelated rows", () => {
    expect(migration015).toContain("upper(ticker)=v_item->>'ticker'");
    expect(migration015).toContain("if v_existing_id is null then");
    expect(migration015).toContain("insert into public.daily_watchlist");
    expect(migration015).toContain("update public.daily_watchlist set");
    expect(migration015).toContain("where id=v_existing_id and user_id=v_user_id");
  });

  it("updates newest QQQ/SPY structure while preserving manual index levels", () => {
    expect(migration015).toContain("qqq_bias=excluded.qqq_bias");
    expect(migration015).toContain("spy_bias=excluded.spy_bias");
    expect(migration015).toContain("qqq_pmh=coalesce(excluded.qqq_pmh, market_days.qqq_pmh)");
    expect(migration015).toContain("spy_pml=coalesce(excluded.spy_pml, market_days.spy_pml)");
  });
});

describe("V1.2.4 additive migration", () => {
  it("adds only Daily Bias schema required by the simplified contract", () => {
    expect(migration016).toContain("add column if not exists daily_bias text");
    expect(migration016).not.toMatch(/create\s+table/i);
  });
  it("wraps 015 transactionally and preserves its merge behavior", () => {
    expect(migration016).toContain("rename to approve_ai_premarket_plan_v121");
    expect(migration016).toContain("v_result := public.approve_ai_premarket_plan_v121");
    expect(migration016).toContain("set daily_bias = nullif(v_item->>'daily_bias', '')");
    expect(migration016).not.toMatch(/delete\s+from\s+public\.daily_watchlist/i);
  });
});
