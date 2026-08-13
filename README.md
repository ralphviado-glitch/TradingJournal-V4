# Trading Journal

A React/Vite trading journal backed by Supabase. The app imports broker filled-order CSV files, reconstructs completed trades, tracks market context, stores journal review fields, and shows performance analytics.

## Stack

- React 19
- Vite
- React Router
- Supabase Auth, Postgres, and Storage
- PapaParse
- Recharts
- Vitest

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` file:

```bash
cp .env.example .env
```

3. Fill in:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only use the Supabase anon/publishable key in the frontend. Do not put service-role keys, database passwords, or private tokens in Vite env vars.

## Supabase

Review and apply migrations from:

```text
supabase/migrations/
```

Phase 1 expects:

- `trades` table with `user_id` ownership.
- `market_days` table with `user_id` ownership and a unique `(user_id, trade_date)` constraint.
- RLS enabled for private tables.
- Private `trade-screenshots` storage bucket.
- Storage object policies that restrict access to `{user_id}/...` paths.

See [docs/database.md](docs/database.md) for the frontend-expected schema and RLS notes.

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```

The test suite currently focuses on CSV order normalization and completed-trade reconstruction.

## Linting

```bash
npm run lint
```

## Building

```bash
npm run build
```

## Manual QA

Use [docs/phase-1-test-checklist.md](docs/phase-1-test-checklist.md) before shipping changes.

## Security

Environment and credential handling notes live in [docs/security-cleanup.md](docs/security-cleanup.md).
