-- Phase 3A: execution analysis fields for imported trades.

alter table public.trades add column if not exists planned_entry numeric;
alter table public.trades add column if not exists planned_stop numeric;
alter table public.trades add column if not exists planned_target numeric;
alter table public.trades add column if not exists planned_risk numeric;

alter table public.trades add column if not exists actual_entry numeric;
alter table public.trades add column if not exists actual_stop numeric;
alter table public.trades add column if not exists actual_exit numeric;
alter table public.trades add column if not exists actual_risk numeric;

alter table public.trades add column if not exists mfe numeric;
alter table public.trades add column if not exists mae numeric;
alter table public.trades add column if not exists exit_efficiency numeric;
