# ChatGPT-Assisted Pre-Market Workflow

V1.2.1 uses a manual Copy → ChatGPT → Import → Approve workflow. The active application does not call the OpenAI API.

The authenticated `prepare-premarket-data` Edge Function fetches regular-session Twelve Data candles and returns a concise structural snapshot. The frontend creates a deterministic, versioned ChatGPT package containing instructions, market data, and the required import contract. Imported JSON is strictly validated and converted into the existing editable draft. Approval uses `approve_ai_premarket_plan` to atomically update existing `market_days` and matching `daily_watchlist` rows without deleting unrelated tickers or clearing PMH/PML and event fields.

## Active configuration and deployment

```sh
supabase secrets set TWELVE_DATA_API_KEY=...
supabase db push # applies pending additive migrations, including 016
supabase functions deploy prepare-premarket-data
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied to deployed Edge Functions by Supabase. The frontend uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values.

The retained `generate-premarket-plan` function is reserved for a future fully automated mode. Do not deploy or call it for V1.2.1. `OPENAI_API_KEY` and `OPENAI_PREMARKET_MODEL` are not required by the active workflow.

Migration `202608170014_ai_premarket_plan.sql` has already been deployed and must remain unchanged. V1.2.1 database corrections live only in `202608170015_chatgpt_premarket_import.sql`, which adds `premarket_data_included` and replaces the approval RPC to accept manual-import metadata while preserving PMH/PML.

PMH/PML are omitted from approval mapping and existing manual values are preserved.

## V1.2.2 market-data reliability

Active preparation is globally prioritized across symbols: all daily requests run first, followed by weekly enrichment, then 5-minute enrichment. One-minute capability remains available in shared code but is not requested by the active workflow. Daily candles alone produce a usable `Partial` snapshot; only a daily-data failure produces `Unavailable`.

For 10 selected tickers plus QQQ/SPY, the former implementation could issue 48 requests concurrently (four per symbol). The active implementation makes at most 36 requests (three per symbol), with fewer requests when daily data is unavailable or an enrichment rate limit stops the lower-priority phase. Each request records a secret-free diagnostic containing ticker, interval, outcome, HTTP/provider error information, and duration.

## V1.2.3 multi-batch approval

Users may prepare and approve multiple independent ticker batches for the same date. The existing approval RPC updates matching tickers and inserts missing tickers; it never deletes watchlist rows outside the current draft. The newest batch updates QQQ/SPY structural context while preserving manual PMH/PML and event fields. No migration beyond the already-deployed 015 behavior is required.

Run Edge utility tests, when Deno is installed, with `deno test supabase/functions/generate-premarket-plan/planUtils_test.ts`.

## V1.2.4 simplified structural preparation

The active preparation path requests exactly 65 regular-session daily candles per symbol. It does not request provider weekly, 5-minute, 1-minute, extended-hours, or premarket data. Daily candles are grouped into UTC calendar weeks beginning Monday. Weekly bias uses the latest six aggregates (at least 20 daily candles and four aggregate weeks are required): greater than 1% close expansion plus a higher high/higher low is Bullish; less than -1% plus a lower high/lower low is Bearish; an absolute close change of 1% or less is Neutral; remaining conflicting structure is Mixed. Insufficient history is explicitly Unavailable and must not be guessed during import.

The daily-only path makes one provider request per symbol: 12 requests for QQQ, SPY, and a full 10-ticker batch, compared with the former maximum of 36. Diagnostics retain explicit `not_requested` entries for weekly, 5-minute, and 1-minute intervals so the absence of those calls is auditable.

Migration `202608170016_simplified_premarket_plan.sql` adds only `daily_watchlist.daily_bias` and wraps the deployed 015 approval RPC. The wrapper remains transactional and delegates all existing merge, authentication, PMH/PML, event-field, and unrelated-row preservation behavior to 015 before persisting Daily Bias. Historical migrations 014 and 015 remain unchanged.
