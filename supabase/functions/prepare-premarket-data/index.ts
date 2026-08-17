import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { prepareMarketSnapshots } from "../generate-premarket-plan/marketSnapshot.ts";
import { PROMPT_VERSION, validateRequest } from "../generate-premarket-plan/planUtils.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Authentication required.", code: "UNAUTHENTICATED" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return reply({ error: "Service is not configured.", code: "SUPABASE_NOT_CONFIGURED" }, 500);
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Authentication required.", code: "UNAUTHENTICATED" }, 401);
    let parsed; try { parsed = validateRequest(await request.json()); } catch (error) { return reply({ error: error instanceof Error ? error.message : "Invalid request.", code: "INVALID_REQUEST" }, 400); }
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
    if (!apiKey) return reply({ error: "Twelve Data is not configured.", code: "TWELVE_DATA_NOT_CONFIGURED" }, 500);
    const prepared = await prepareMarketSnapshots(parsed.symbols, parsed.tradeDate, apiKey);
    const marketData = prepared.marketData;
    if (!marketData.find((item) => item.ticker === "QQQ")?.dataAvailable || !marketData.find((item) => item.ticker === "SPY")?.dataAvailable) return reply({ error: "QQQ and SPY daily data are required.", code: "REQUIRED_MARKET_DATA_UNAVAILABLE", warnings: prepared.warningSummary, diagnostics: prepared.diagnostics }, 502);
    const now = new Date().toISOString();
    return reply({ tradeDate: parsed.tradeDate, marketData, warnings: prepared.warningSummary, diagnostics: prepared.diagnostics, metadata: { generatedAt: now, dataAsOf: now, tickersAnalyzed: parsed.symbols, promptVersion: PROMPT_VERSION, premarketDataIncluded: false } });
  } catch (error) { console.error("prepare-premarket-data failed", error); return reply({ error: "Market data preparation is temporarily unavailable.", code: "PREPARATION_FAILURE" }, 500); }
});
