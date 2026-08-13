-- Phase 5: additive workflow automation and watchlist planning snapshot.
alter table public.trades add column if not exists processing_status text;
alter table public.trades add column if not exists excursion_status text;
alter table public.trades add column if not exists management_status text;
alter table public.trades add column if not exists watchlist_match_status text;
alter table public.trades add column if not exists review_status text;
alter table public.trades add column if not exists review_completed_at timestamptz;
alter table public.trades add column if not exists watchlist_item_id uuid references public.daily_watchlist(id) on delete set null;
alter table public.trades add column if not exists planned_trade boolean;
alter table public.trades add column if not exists watchlist_rank integer;
alter table public.trades add column if not exists planned_direction text;
alter table public.trades add column if not exists direction_matched boolean;
alter table public.trades add column if not exists planned_setup text;
alter table public.trades add column if not exists planned_key_levels text;
alter table public.trades add column if not exists planned_notes text;
alter table public.trades add column if not exists processing_error text;
create index if not exists trades_watchlist_item_id_idx on public.trades (watchlist_item_id);
create index if not exists trades_user_review_status_idx on public.trades (user_id, review_status);

