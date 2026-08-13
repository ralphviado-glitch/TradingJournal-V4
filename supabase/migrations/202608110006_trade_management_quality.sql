-- Phase 3B: trade management, setup quality, and execution quality.
-- Existing trades remain unchanged; existing trades RLS applies to these columns.

alter table public.trades add column if not exists setup_quality text;
alter table public.trades add column if not exists execution_quality text;
alter table public.trades add column if not exists execution_score numeric;

alter table public.trades add column if not exists first_scale_price numeric;
alter table public.trades add column if not exists first_scale_shares numeric;
alter table public.trades add column if not exists first_scale_percent numeric;

alter table public.trades add column if not exists runner_exit_price numeric;
alter table public.trades add column if not exists runner_shares numeric;
alter table public.trades add column if not exists runner_percent numeric;

alter table public.trades add column if not exists management_notes text;

alter table public.trades add column if not exists planned_first_scale_price numeric;
alter table public.trades add column if not exists planned_first_scale_percent numeric;
alter table public.trades add column if not exists planned_runner_target numeric;
alter table public.trades add column if not exists planned_runner_percent numeric;

