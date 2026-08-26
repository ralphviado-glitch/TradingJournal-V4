-- V1.3.1: minimum browser privileges for Fast Trade Review.
-- RLS remains enabled and continues to scope every row to auth.uid().

grant select, insert
on table public.review_setup_tags, public.review_confluence_tags
to authenticated;

grant select, insert, delete
on table public.trade_setup_tags, public.trade_confluence_tags
to authenticated;

