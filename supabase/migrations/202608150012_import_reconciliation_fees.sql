-- V1.0.1 importer accuracy: nullable fields preserve historical pnl semantics.
alter table public.trades add column if not exists gross_pnl numeric;
alter table public.trades add column if not exists fees numeric;
alter table public.trades add column if not exists net_pnl numeric;
alter table public.trades add column if not exists pnl_source text;
alter table public.trades drop constraint if exists trades_pnl_source_check;
alter table public.trades add constraint trades_pnl_source_check check (pnl_source is null or pnl_source in ('broker', 'calculated_net', 'legacy', 'gross_only'));
