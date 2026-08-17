-- AI-assisted pre-market metadata and atomic approval into the existing plan tables.
alter table public.market_days add column if not exists generation_source text not null default 'manual';
alter table public.market_days add column if not exists ai_generated_at timestamptz;
alter table public.market_days add column if not exists ai_model text;
alter table public.market_days add column if not exists ai_data_as_of timestamptz;
alter table public.market_days add column if not exists ai_prompt_version text;

create or replace function public.approve_ai_premarket_plan(
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
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_existing_id uuid;
  v_count integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_trade_date is null or p_market_day is null or jsonb_typeof(p_watchlist) <> 'array' then raise exception 'Invalid approval payload'; end if;
  if jsonb_array_length(p_watchlist) > 10 then raise exception 'No more than 10 watchlist tickers are allowed'; end if;

  insert into public.market_days (
    user_id, trade_date, market_condition, expected_trading_day, notes,
    qqq_bias, qqq_weekly_bias, qqq_daily_bias, qqq_intraday_bias, qqq_market_environment,
    qqq_pdh, qqq_pdl, qqq_pmh, qqq_pml, qqq_liquidity_target, qqq_most_important_level, qqq_bull_trigger, qqq_bear_trigger, qqq_game_plan,
    spy_bias, spy_weekly_bias, spy_daily_bias, spy_intraday_bias, spy_market_environment,
    spy_pdh, spy_pdl, spy_pmh, spy_pml, spy_liquidity_target, spy_most_important_level, spy_bull_trigger, spy_bear_trigger, spy_game_plan,
    generation_source, ai_generated_at, ai_model, ai_data_as_of, ai_prompt_version, updated_at
  ) values (
    v_user_id, p_trade_date, coalesce(p_market_day->>'market_condition', ''), p_market_day->>'expected_trading_day', p_market_day->>'notes',
    coalesce(p_market_day->>'qqq_bias', 'Neutral'), p_market_day->>'qqq_weekly_bias', p_market_day->>'qqq_daily_bias', p_market_day->>'qqq_intraday_bias', p_market_day->>'qqq_market_environment',
    nullif(p_market_day->>'qqq_pdh','')::numeric, nullif(p_market_day->>'qqq_pdl','')::numeric, nullif(p_market_day->>'qqq_pmh','')::numeric, nullif(p_market_day->>'qqq_pml','')::numeric, p_market_day->>'qqq_liquidity_target', nullif(p_market_day->>'qqq_most_important_level','')::numeric, nullif(p_market_day->>'qqq_bull_trigger','')::numeric, nullif(p_market_day->>'qqq_bear_trigger','')::numeric, p_market_day->>'qqq_game_plan',
    coalesce(p_market_day->>'spy_bias', 'Neutral'), p_market_day->>'spy_weekly_bias', p_market_day->>'spy_daily_bias', p_market_day->>'spy_intraday_bias', p_market_day->>'spy_market_environment',
    nullif(p_market_day->>'spy_pdh','')::numeric, nullif(p_market_day->>'spy_pdl','')::numeric, nullif(p_market_day->>'spy_pmh','')::numeric, nullif(p_market_day->>'spy_pml','')::numeric, p_market_day->>'spy_liquidity_target', nullif(p_market_day->>'spy_most_important_level','')::numeric, nullif(p_market_day->>'spy_bull_trigger','')::numeric, nullif(p_market_day->>'spy_bear_trigger','')::numeric, p_market_day->>'spy_game_plan',
    'ai_assisted', nullif(p_metadata->>'ai_generated_at','')::timestamptz, p_metadata->>'ai_model', nullif(p_metadata->>'ai_data_as_of','')::timestamptz, p_metadata->>'ai_prompt_version', now()
  ) on conflict (user_id, trade_date) do update set
    market_condition=excluded.market_condition, expected_trading_day=excluded.expected_trading_day, notes=excluded.notes,
    qqq_bias=excluded.qqq_bias, qqq_weekly_bias=excluded.qqq_weekly_bias, qqq_daily_bias=excluded.qqq_daily_bias, qqq_intraday_bias=excluded.qqq_intraday_bias, qqq_market_environment=excluded.qqq_market_environment,
    qqq_pdh=excluded.qqq_pdh, qqq_pdl=excluded.qqq_pdl, qqq_pmh=excluded.qqq_pmh, qqq_pml=excluded.qqq_pml, qqq_liquidity_target=excluded.qqq_liquidity_target, qqq_most_important_level=excluded.qqq_most_important_level, qqq_bull_trigger=excluded.qqq_bull_trigger, qqq_bear_trigger=excluded.qqq_bear_trigger, qqq_game_plan=excluded.qqq_game_plan,
    spy_bias=excluded.spy_bias, spy_weekly_bias=excluded.spy_weekly_bias, spy_daily_bias=excluded.spy_daily_bias, spy_intraday_bias=excluded.spy_intraday_bias, spy_market_environment=excluded.spy_market_environment,
    spy_pdh=excluded.spy_pdh, spy_pdl=excluded.spy_pdl, spy_pmh=excluded.spy_pmh, spy_pml=excluded.spy_pml, spy_liquidity_target=excluded.spy_liquidity_target, spy_most_important_level=excluded.spy_most_important_level, spy_bull_trigger=excluded.spy_bull_trigger, spy_bear_trigger=excluded.spy_bear_trigger, spy_game_plan=excluded.spy_game_plan,
    generation_source=excluded.generation_source, ai_generated_at=excluded.ai_generated_at, ai_model=excluded.ai_model, ai_data_as_of=excluded.ai_data_as_of, ai_prompt_version=excluded.ai_prompt_version, updated_at=now();

  for v_item in select value from jsonb_array_elements(p_watchlist) loop
    if not (v_item->>'ticker' ~ '^[A-Z][A-Z0-9.-]{0,14}$') then raise exception 'Invalid ticker'; end if;
    select id into v_existing_id from public.daily_watchlist where user_id=v_user_id and trade_date=p_trade_date and upper(ticker)=v_item->>'ticker' order by created_at limit 1;
    if v_existing_id is null then
      insert into public.daily_watchlist (user_id,trade_date,ticker,direction,priority,setup,key_levels,notes,overall_rating,weekly_bias,intraday_bias,relative_strength,confidence,long_scenario_enabled,long_trigger,long_setup,long_target,long_invalidation,short_scenario_enabled,short_trigger,short_setup,short_target,short_invalidation,bottom_line,atr,pdh,pdl,pmh,pml)
      values (v_user_id,p_trade_date,v_item->>'ticker',coalesce(v_item->>'direction','Neutral'),coalesce((v_item->>'priority')::int,1),'','','',v_item->>'overall_rating',v_item->>'weekly_bias',v_item->>'intraday_bias',v_item->>'relative_strength',v_item->>'confidence',coalesce((v_item->>'long_scenario_enabled')::boolean,false),v_item->>'long_trigger',v_item->>'long_setup',v_item->>'long_target',v_item->>'long_invalidation',coalesce((v_item->>'short_scenario_enabled')::boolean,false),v_item->>'short_trigger',v_item->>'short_setup',v_item->>'short_target',v_item->>'short_invalidation',v_item->>'bottom_line',nullif(v_item->>'atr','')::numeric,nullif(v_item->>'pdh','')::numeric,nullif(v_item->>'pdl','')::numeric,nullif(v_item->>'pmh','')::numeric,nullif(v_item->>'pml','')::numeric);
    else
      update public.daily_watchlist set direction=coalesce(v_item->>'direction','Neutral'),priority=coalesce((v_item->>'priority')::int,priority),overall_rating=v_item->>'overall_rating',weekly_bias=v_item->>'weekly_bias',intraday_bias=v_item->>'intraday_bias',relative_strength=v_item->>'relative_strength',confidence=v_item->>'confidence',long_scenario_enabled=coalesce((v_item->>'long_scenario_enabled')::boolean,false),long_trigger=v_item->>'long_trigger',long_setup=v_item->>'long_setup',long_target=v_item->>'long_target',long_invalidation=v_item->>'long_invalidation',short_scenario_enabled=coalesce((v_item->>'short_scenario_enabled')::boolean,false),short_trigger=v_item->>'short_trigger',short_setup=v_item->>'short_setup',short_target=v_item->>'short_target',short_invalidation=v_item->>'short_invalidation',bottom_line=v_item->>'bottom_line',atr=nullif(v_item->>'atr','')::numeric,pdh=nullif(v_item->>'pdh','')::numeric,pdl=nullif(v_item->>'pdl','')::numeric,pmh=nullif(v_item->>'pmh','')::numeric,pml=nullif(v_item->>'pml','')::numeric,updated_at=now() where id=v_existing_id and user_id=v_user_id;
    end if;
    v_existing_id := null; v_count := v_count + 1;
  end loop;
  return jsonb_build_object('approved',true,'tradeDate',p_trade_date,'watchlistCount',v_count);
end;
$$;

revoke all on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) from public;
grant execute on function public.approve_ai_premarket_plan(date,jsonb,jsonb,jsonb) to authenticated;
