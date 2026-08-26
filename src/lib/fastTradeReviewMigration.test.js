import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration001 = readFileSync(new URL("../../supabase/migrations/202608100001_phase1_stabilization.sql", import.meta.url), "utf8");
const migration018 = readFileSync(new URL("../../supabase/migrations/202608260018_fast_trade_review.sql", import.meta.url), "utf8");
const migration019 = readFileSync(new URL("../../supabase/migrations/202608260019_fast_trade_review_permissions.sql", import.meta.url), "utf8");

describe("V1.3 migration 018 trade ownership foreign keys", () => {
  it("does not infer a deployed trades(id) primary key from CREATE TABLE IF NOT EXISTS", () => {
    expect(migration001).toMatch(/create table if not exists public\.trades/i);
    expect(migration001).not.toMatch(/alter table public\.trades\s+add (?:constraint .* )?primary key/i);
    expect(migration001).not.toMatch(/create unique index .* on public\.trades\s*\(id\)/i);
  });

  it("references the actual user-scoped trades key in both association tables", () => {
    expect(migration018.match(/foreign key\s*\(trade_id, user_id\)\s*references public\.trades\(id, user_id\)/gi)).toHaveLength(2);
    expect(migration018).not.toMatch(/references public\.trades\(id\)(?!,)/i);
  });

  it("enforces same-user tag ownership with composite foreign keys", () => {
    expect(migration018).toMatch(/foreign key\s*\(tag_id, user_id\)\s*references public\.review_setup_tags\(id, user_id\)/i);
    expect(migration018).toMatch(/foreign key\s*\(tag_id, user_id\)\s*references public\.review_confluence_tags\(id, user_id\)/i);
    expect(migration018.match(/unique\s*\(id, user_id\)/gi)).toHaveLength(2);
  });
});

describe("V1.3.1 migration 019 minimum authenticated privileges", () => {
  it("grants tag libraries only the SELECT and INSERT operations used by the browser", () => {
    expect(migration019).toMatch(/grant\s+select,\s*insert\s+on table\s+public\.review_setup_tags,\s*public\.review_confluence_tags\s+to authenticated/i);
  });

  it("grants association tables only SELECT, INSERT, and DELETE", () => {
    expect(migration019).toMatch(/grant\s+select,\s*insert,\s*delete\s+on table\s+public\.trade_setup_tags,\s*public\.trade_confluence_tags\s+to authenticated/i);
  });

  it("does not grant UPDATE, TRUNCATE, anon, service-role, or sequence access", () => {
    expect(migration019).not.toMatch(/\bupdate\b|\btruncate\b|\bservice_role\b|\bsequence\b/i);
    expect(migration019).not.toMatch(/\bto\s+anon\b/i);
  });

  it("keeps RLS and auth.uid ownership policies on all four tables", () => {
    for (const table of ["review_setup_tags", "review_confluence_tags", "trade_setup_tags", "trade_confluence_tags"]) {
      expect(migration018).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
    expect(migration018.match(/auth\.uid\(\)\s*=\s*user_id/gi)?.length).toBeGreaterThanOrEqual(4);
  });
});
