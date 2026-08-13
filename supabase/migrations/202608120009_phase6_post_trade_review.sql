-- Phase 6: nullable rules semantics and daily debrief persistence.
alter table public.trades alter column rules_followed drop not null;
alter table public.trades alter column rules_followed drop default;

alter table public.market_days add column if not exists reflection_well text;
alter table public.market_days add column if not exists reflection_weakness text;
alter table public.market_days add column if not exists reflection_focus text;
alter table public.market_days add column if not exists reflection_notes text;
alter table public.market_days add column if not exists trading_day_completed_at timestamptz;
