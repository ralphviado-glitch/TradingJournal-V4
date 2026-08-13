-- Phase 1 stabilization: additive schema support, RLS, and private screenshot storage.
-- Review against the remote project before applying.

create extension if not exists pgcrypto;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  ticker text not null,
  direction text,
  entry_time text,
  exit_time text,
  entry_price numeric not null,
  exit_price numeric,
  shares numeric not null,
  pnl numeric not null default 0,
  risk numeric default 0,
  setup text default 'Unclassified',
  notes text default '',
  grade text default '',
  mistake_tags text[] not null default '{}',
  emotion_tags text[] not null default '{}',
  rules_followed boolean not null default false,
  orders jsonb not null default '[]'::jsonb,
  screenshot_path text,
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.trades add column if not exists trade_date date;
alter table public.trades add column if not exists ticker text;
alter table public.trades add column if not exists direction text;
alter table public.trades add column if not exists entry_time text;
alter table public.trades add column if not exists exit_time text;
alter table public.trades add column if not exists entry_price numeric;
alter table public.trades add column if not exists exit_price numeric;
alter table public.trades add column if not exists shares numeric;
alter table public.trades add column if not exists pnl numeric default 0;
alter table public.trades add column if not exists risk numeric default 0;
alter table public.trades add column if not exists setup text default 'Unclassified';
alter table public.trades add column if not exists notes text default '';
alter table public.trades add column if not exists grade text default '';
alter table public.trades add column if not exists mistake_tags text[] not null default '{}';
alter table public.trades add column if not exists emotion_tags text[] not null default '{}';
alter table public.trades add column if not exists rules_followed boolean not null default false;
alter table public.trades add column if not exists orders jsonb not null default '[]'::jsonb;
alter table public.trades add column if not exists screenshot_path text;
alter table public.trades add column if not exists screenshot_url text;
alter table public.trades add column if not exists created_at timestamptz not null default now();
alter table public.trades add column if not exists updated_at timestamptz not null default now();

create table if not exists public.market_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  market_condition text not null,
  spy_bias text not null,
  spy_pdh numeric,
  spy_pdl numeric,
  spy_pmh numeric,
  spy_pml numeric,
  spy_liquidity_target text default '',
  qqq_bias text not null,
  qqq_pdh numeric,
  qqq_pdl numeric,
  qqq_pmh numeric,
  qqq_pml numeric,
  qqq_liquidity_target text default '',
  event_type text default '',
  event_name text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trade_date)
);

alter table public.market_days add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.market_days add column if not exists trade_date date;
alter table public.market_days add column if not exists market_condition text;
alter table public.market_days add column if not exists spy_bias text;
alter table public.market_days add column if not exists spy_pdh numeric;
alter table public.market_days add column if not exists spy_pdl numeric;
alter table public.market_days add column if not exists spy_pmh numeric;
alter table public.market_days add column if not exists spy_pml numeric;
alter table public.market_days add column if not exists spy_liquidity_target text default '';
alter table public.market_days add column if not exists qqq_bias text;
alter table public.market_days add column if not exists qqq_pdh numeric;
alter table public.market_days add column if not exists qqq_pdl numeric;
alter table public.market_days add column if not exists qqq_pmh numeric;
alter table public.market_days add column if not exists qqq_pml numeric;
alter table public.market_days add column if not exists qqq_liquidity_target text default '';
alter table public.market_days add column if not exists event_type text default '';
alter table public.market_days add column if not exists event_name text default '';
alter table public.market_days add column if not exists notes text default '';
alter table public.market_days add column if not exists created_at timestamptz not null default now();
alter table public.market_days add column if not exists updated_at timestamptz not null default now();

create unique index if not exists market_days_user_trade_date_idx on public.market_days (user_id, trade_date);
create index if not exists trades_user_trade_date_idx on public.trades (user_id, trade_date);
create index if not exists trades_user_ticker_idx on public.trades (user_id, ticker);

alter table public.trades enable row level security;
alter table public.market_days enable row level security;

drop policy if exists "Users can select own trades" on public.trades;
drop policy if exists "Users can insert own trades" on public.trades;
drop policy if exists "Users can update own trades" on public.trades;
drop policy if exists "Users can delete own trades" on public.trades;

create policy "Users can select own trades"
on public.trades for select
using (auth.uid() = user_id);

create policy "Users can insert own trades"
on public.trades for insert
with check (auth.uid() = user_id);

create policy "Users can update own trades"
on public.trades for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own trades"
on public.trades for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own market days" on public.market_days;
drop policy if exists "Users can insert own market days" on public.market_days;
drop policy if exists "Users can update own market days" on public.market_days;
drop policy if exists "Users can delete own market days" on public.market_days;

create policy "Users can select own market days"
on public.market_days for select
using (auth.uid() = user_id);

create policy "Users can insert own market days"
on public.market_days for insert
with check (auth.uid() = user_id);

create policy "Users can update own market days"
on public.market_days for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own market days"
on public.market_days for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view own trade screenshots" on storage.objects;
drop policy if exists "Users can upload own trade screenshots" on storage.objects;
drop policy if exists "Users can update own trade screenshots" on storage.objects;
drop policy if exists "Users can delete own trade screenshots" on storage.objects;

create policy "Users can view own trade screenshots"
on storage.objects for select
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own trade screenshots"
on storage.objects for insert
with check (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own trade screenshots"
on storage.objects for update
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own trade screenshots"
on storage.objects for delete
using (
  bucket_id = 'trade-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);
