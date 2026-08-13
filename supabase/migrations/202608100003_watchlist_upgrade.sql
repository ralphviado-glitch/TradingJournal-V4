-- Phase 2B: structured watchlist levels and private watchlist screenshots.

alter table public.daily_watchlist add column if not exists pmh numeric;
alter table public.daily_watchlist add column if not exists pml numeric;
alter table public.daily_watchlist add column if not exists pdh numeric;
alter table public.daily_watchlist add column if not exists pdl numeric;
alter table public.daily_watchlist add column if not exists ath numeric;
alter table public.daily_watchlist add column if not exists major_support numeric;
alter table public.daily_watchlist add column if not exists major_resistance numeric;
alter table public.daily_watchlist add column if not exists atr numeric;
alter table public.daily_watchlist add column if not exists screenshot_path text;

insert into storage.buckets (id, name, public)
values ('watchlist-screenshots', 'watchlist-screenshots', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view own watchlist screenshots" on storage.objects;
drop policy if exists "Users can upload own watchlist screenshots" on storage.objects;
drop policy if exists "Users can update own watchlist screenshots" on storage.objects;
drop policy if exists "Users can delete own watchlist screenshots" on storage.objects;

create policy "Users can view own watchlist screenshots"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'watchlist-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own watchlist screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'watchlist-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own watchlist screenshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'watchlist-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'watchlist-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own watchlist screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'watchlist-screenshots'
  and auth.uid()::text = (storage.foldername(name))[1]
);
