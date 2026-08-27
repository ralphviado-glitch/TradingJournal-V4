-- V1.3.3: soft-delete review tags while preserving historical trade associations.
alter table public.review_setup_tags add column if not exists archived_at timestamptz;
alter table public.review_confluence_tags add column if not exists archived_at timestamptz;

create index if not exists review_setup_tags_active
  on public.review_setup_tags (user_id, name) where archived_at is null;
create index if not exists review_confluence_tags_active
  on public.review_confluence_tags (user_id, name) where archived_at is null;

grant update
on table public.review_setup_tags, public.review_confluence_tags
to authenticated;
