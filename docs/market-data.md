# Market Data Provider Setup

Phase 3A.1 uses Twelve Data through a Supabase Edge Function. The Twelve Data API key must stay server-side.

## Architecture

React calls the authenticated Supabase client:

`React -> supabase.functions.invoke("market-data") -> Twelve Data -> normalized candles -> excursion engine`

The frontend never calls Twelve Data directly and never receives `TWELVE_DATA_API_KEY`.

## Secret

Set this as a Supabase Edge Function secret:

```bash
supabase secrets set TWELVE_DATA_API_KEY=your_key_here
```

Do not use `VITE_TWELVE_DATA_API_KEY`. `VITE_*` values are bundled into browser code.

## Deploy

Deploy the function:

```bash
supabase functions deploy market-data
```

For local development, use Supabase CLI secrets or a local function environment file that is ignored by Git. Never commit real keys.

## Request Contract

The frontend sends:

```json
{
  "ticker": "NVDA",
  "startTime": "2026-08-10T13:30:00.000Z",
  "endTime": "2026-08-10T13:45:00.000Z",
  "interval": "1min"
}
```

The Edge Function validates the symbol, timestamps, interval, and request window. It does not accept upstream URLs.

## Timezone

Trade The Pool CSV timestamps are parsed as `DD.MM.YYYY HH:mm:ss` in `Pacific/Auckland`, converted once to an unambiguous UTC instant, and stored in reconstructed orders together with their derived `America/New_York` trading date and time. Parent trade date, entry time, and exit time use those New York values. The frontend converts the normalized New York parent fields back to UTC RFC3339 timestamps before calling the Edge Function.

The Edge Function then requests Twelve Data with:

`timezone=America/New_York`

The UTC-to-New-York formatting in the Edge Function supplies Twelve Data's requested wall-clock parameters; it does not reinterpret the original Auckland source timestamp. Both conversions use IANA timezone rules and never use the browser timezone.

## Candle Convention

Excursion analysis uses 1-minute OHLC bars, not tick-level reconstruction.

The app includes:

- the entry minute
- the exit minute

If a timestamp includes seconds, it is mapped to that minute's 1-minute bar.

## Returned Candle Format

The function returns normalized candles:

```json
[
  {
    "timestamp": "2026-08-10 09:30:00",
    "open": 184.1,
    "high": 184.5,
    "low": 183.8,
    "close": 184.2,
    "volume": 12000
  }
]
```

Malformed bars are rejected safely. Twelve Data rate-limit and upstream errors are mapped to safe app messages.
