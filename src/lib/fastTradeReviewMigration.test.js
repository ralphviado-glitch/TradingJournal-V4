import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration001 = readFileSync(new URL("../../supabase/migrations/202608100001_phase1_stabilization.sql", import.meta.url), "utf8");
const migration018 = readFileSync(new URL("../../supabase/migrations/202608260018_fast_trade_review.sql", import.meta.url), "utf8");

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
