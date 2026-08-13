-- Phase 3A.1: automatic excursion engine outputs for imported trades.

alter table public.trades add column if not exists mfe_per_share numeric;
alter table public.trades add column if not exists mae_per_share numeric;
alter table public.trades add column if not exists mfe_dollars numeric;
alter table public.trades add column if not exists mae_dollars numeric;
alter table public.trades add column if not exists mfe_r numeric;
alter table public.trades add column if not exists mae_r numeric;
alter table public.trades add column if not exists highest_price_during_trade numeric;
alter table public.trades add column if not exists lowest_price_during_trade numeric;
alter table public.trades add column if not exists excursion_calculated_at timestamptz;
