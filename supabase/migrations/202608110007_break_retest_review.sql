-- Phase 3C: structured Break & Retest setup and rule-adherence review.
-- Nullable columns preserve Unknown for historical trades. Existing trades RLS applies.

alter table public.trades add column if not exists break_retest_setup boolean;
alter table public.trades add column if not exists break_direction text;
alter table public.trades add column if not exists break_level_type text;
alter table public.trades add column if not exists break_level_price numeric;
alter table public.trades add column if not exists displacement_present boolean;
alter table public.trades add column if not exists displacement_quality text;
alter table public.trades add column if not exists retest_present boolean;
alter table public.trades add column if not exists retest_quality text;
alter table public.trades add column if not exists volume_confirmation boolean;
alter table public.trades add column if not exists qqq_alignment text;
alter table public.trades add column if not exists spy_alignment text;
alter table public.trades add column if not exists market_alignment text;
alter table public.trades add column if not exists room_to_next_level boolean;
alter table public.trades add column if not exists next_level_price numeric;
alter table public.trades add column if not exists distance_to_next_level numeric;
alter table public.trades add column if not exists distance_to_next_level_r numeric;
alter table public.trades add column if not exists extended_before_entry boolean;
alter table public.trades add column if not exists entered_after_first_5min boolean;
alter table public.trades add column if not exists first_5min_break boolean;
alter table public.trades add column if not exists entry_trigger text;
alter table public.trades add column if not exists entry_confirmation text;
alter table public.trades add column if not exists rule_adherence_score numeric;
alter table public.trades add column if not exists rule_violations text[];
alter table public.trades add column if not exists setup_review_notes text;

