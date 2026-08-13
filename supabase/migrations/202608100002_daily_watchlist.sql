-- Phase 2A: daily watchlist for the Today trading workspace.

create table if not exists public.daily_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  ticker text not null,
  direction text not null default 'Neutral',
  priority integer not null default 1,
  setup text not null default '',
  key_levels text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_watchlist_direction_check check (
    direction in ('Long', 'Short', 'Both', 'Neutral')
  )
);

create index if not exists daily_watchlist_user_id_idx
on public.daily_watchlist (user_id);

create index if not exists daily_watchlist_trade_date_idx
on public.daily_watchlist (trade_date);

create index if not exists daily_watchlist_user_date_priority_idx
on public.daily_watchlist (user_id, trade_date, priority);

alter table public.daily_watchlist enable row level security;

drop policy if exists "Users can select own daily watchlist" on public.daily_watchlist;
drop policy if exists "Users can insert own daily watchlist" on public.daily_watchlist;
drop policy if exists "Users can update own daily watchlist" on public.daily_watchlist;
drop policy if exists "Users can delete own daily watchlist" on public.daily_watchlist;

create policy "Users can select own daily watchlist"
on public.daily_watchlist
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own daily watchlist"
on public.daily_watchlist
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own daily watchlist"
on public.daily_watchlist
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own daily watchlist"
on public.daily_watchlist
for delete
to authenticated
using (auth.uid() = user_id);
