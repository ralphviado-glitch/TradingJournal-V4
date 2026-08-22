-- V1.2.6: persist deterministic structural levels during AI/ChatGPT batch approval.
-- The columns already exist from migration 003; this additive wrapper keeps
-- manual values when an older or partial import omits a level.
alter function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb)
  rename to approve_ai_premarket_plan_v124;

create function public.approve_ai_premarket_plan(
  p_trade_date date,
  p_market_day jsonb,
  p_watchlist jsonb,
  p_metadata jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
  v_item jsonb;
begin
  v_result := public.approve_ai_premarket_plan_v124(p_trade_date, p_market_day, p_watchlist, p_metadata);

  for v_item in select value from jsonb_array_elements(p_watchlist) loop
    update public.daily_watchlist
      set major_support = coalesce(nullif(v_item->>'major_support', '')::numeric, major_support),
          major_resistance = coalesce(nullif(v_item->>'major_resistance', '')::numeric, major_resistance),
          updated_at = now()
      where user_id = auth.uid()
        and trade_date = p_trade_date
        and upper(ticker) = upper(v_item->>'ticker');
  end loop;

  return v_result;
end;
$$;

revoke all on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) from public;
grant execute on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.approve_ai_premarket_plan_v124(date,jsonb,jsonb,jsonb) from public;
grant execute on function public.approve_ai_premarket_plan_v124(date,jsonb,jsonb,jsonb) to authenticated;
