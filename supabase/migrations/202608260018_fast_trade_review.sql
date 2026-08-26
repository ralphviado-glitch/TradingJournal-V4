-- V1.3 additive fast trade review. Legacy setup and detailed-review columns are preserved.
create table if not exists public.review_setup_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_name),
  unique (id, user_id)
);

create table if not exists public.review_confluence_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_name),
  unique (id, user_id)
);

-- The deployed trades table uses a user-scoped unique key. Migration 001's
-- `id primary key` declaration only applied when it created a missing table;
-- it did not retrofit uniqueness onto an already-existing trades table.
create table if not exists public.trade_setup_tags (
  trade_id uuid not null,
  tag_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (trade_id, tag_id, user_id),
  foreign key (trade_id, user_id) references public.trades(id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references public.review_setup_tags(id, user_id) on delete restrict
);

create table if not exists public.trade_confluence_tags (
  trade_id uuid not null,
  tag_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (trade_id, tag_id, user_id),
  foreign key (trade_id, user_id) references public.trades(id, user_id) on delete cascade,
  foreign key (tag_id, user_id) references public.review_confluence_tags(id, user_id) on delete restrict
);
alter table public.trades add column if not exists quick_review_sequence jsonb;
alter table public.trades add column if not exists quick_review_context jsonb;
alter table public.trades add column if not exists quick_review_execution jsonb;
alter table public.trades add column if not exists review_note text;
alter table public.trades add column if not exists setup_grade text;
alter table public.trades add column if not exists execution_grade text;
alter table public.trades add column if not exists final_grade text;
alter table public.trades add column if not exists outcome_classification text;
alter table public.trades add column if not exists grade_explanation text;
alter table public.trades add column if not exists grading_version text;
alter table public.trades add column if not exists quick_review_completed_at timestamptz;
alter table public.trades alter column review_status drop default;

alter table public.review_setup_tags enable row level security; alter table public.review_confluence_tags enable row level security;
alter table public.trade_setup_tags enable row level security; alter table public.trade_confluence_tags enable row level security;
create policy "own setup tags" on public.review_setup_tags for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own confluence tags" on public.review_confluence_tags for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own trade setup associations" on public.trade_setup_tags for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.trades t where t.id=trade_id and t.user_id=auth.uid()) and exists(select 1 from public.review_setup_tags x where x.id=tag_id and x.user_id=auth.uid()));
create policy "own trade confluence associations" on public.trade_confluence_tags for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.trades t where t.id=trade_id and t.user_id=auth.uid()) and exists(select 1 from public.review_confluence_tags x where x.id=tag_id and x.user_id=auth.uid()));
create index if not exists trade_setup_tags_user_trade on public.trade_setup_tags(user_id,trade_id);
create index if not exists trade_confluence_tags_user_trade on public.trade_confluence_tags(user_id,trade_id);
