-- V1.2.4: persist ticker Daily Bias without modifying deployed migrations 014/015.
alter table public.daily_watchlist add column if not exists daily_bias text;

-- Preserve the deployed 015 implementation and wrap it transactionally to add
-- the new daily_bias field to the same approval operation.
alter function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb)
  rename to approve_ai_premarket_plan_v121;

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
  -- The retained 015 function performs authentication, validation, market-day
  -- upsert, ticker merge, PMH/PML preservation, and source metadata updates.
  v_result := public.approve_ai_premarket_plan_v121(p_trade_date, p_market_day, p_watchlist, p_metadata);

  for v_item in select value from jsonb_array_elements(p_watchlist) loop
    update public.daily_watchlist
      set daily_bias = nullif(v_item->>'daily_bias', ''), updated_at = now()
      where user_id = auth.uid()
        and trade_date = p_trade_date
        and upper(ticker) = v_item->>'ticker';
  end loop;

  return v_result;
end;
$$;

revoke all on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) from public;
grant execute on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.approve_ai_premarket_plan_v121(date,jsonb,jsonb,jsonb) from public;
grant execute on function public.approve_ai_premarket_plan_v121(date,jsonb,jsonb,jsonb) to authenticated;
