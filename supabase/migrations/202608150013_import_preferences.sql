-- Server-side Trade The Pool import preference, scoped to the authenticated user.
create table if not exists public.import_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_ttp_account text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.import_preferences enable row level security;
drop policy if exists "Users can select own import preferences" on public.import_preferences;
drop policy if exists "Users can insert own import preferences" on public.import_preferences;
drop policy if exists "Users can update own import preferences" on public.import_preferences;
create policy "Users can select own import preferences" on public.import_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own import preferences" on public.import_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own import preferences" on public.import_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
