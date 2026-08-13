-- Pre-market plan detail fields and private index screenshots.
alter table public.market_days add column if not exists expected_trading_day text;
alter table public.market_days add column if not exists qqq_weekly_bias text;
alter table public.market_days add column if not exists qqq_daily_bias text;
alter table public.market_days add column if not exists qqq_intraday_bias text;
alter table public.market_days add column if not exists qqq_market_environment text;
alter table public.market_days add column if not exists qqq_bull_trigger numeric;
alter table public.market_days add column if not exists qqq_bear_trigger numeric;
alter table public.market_days add column if not exists qqq_most_important_level numeric;
alter table public.market_days add column if not exists qqq_game_plan text;
alter table public.market_days add column if not exists qqq_screenshot_path text;
alter table public.market_days add column if not exists spy_weekly_bias text;
alter table public.market_days add column if not exists spy_daily_bias text;
alter table public.market_days add column if not exists spy_intraday_bias text;
alter table public.market_days add column if not exists spy_market_environment text;
alter table public.market_days add column if not exists spy_bull_trigger numeric;
alter table public.market_days add column if not exists spy_bear_trigger numeric;
alter table public.market_days add column if not exists spy_most_important_level numeric;
alter table public.market_days add column if not exists spy_game_plan text;
alter table public.market_days add column if not exists spy_screenshot_path text;

insert into storage.buckets (id, name, public)
values ('market-plan-screenshots', 'market-plan-screenshots', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view own market plan screenshots" on storage.objects;
drop policy if exists "Users can upload own market plan screenshots" on storage.objects;
drop policy if exists "Users can update own market plan screenshots" on storage.objects;
drop policy if exists "Users can delete own market plan screenshots" on storage.objects;
create policy "Users can view own market plan screenshots" on storage.objects for select using (bucket_id = 'market-plan-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can upload own market plan screenshots" on storage.objects for insert with check (bucket_id = 'market-plan-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own market plan screenshots" on storage.objects for update using (bucket_id = 'market-plan-screenshots' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'market-plan-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own market plan screenshots" on storage.objects for delete using (bucket_id = 'market-plan-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
