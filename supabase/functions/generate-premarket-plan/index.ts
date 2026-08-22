import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PROMPT_VERSION, validateDraft, validateRequest } from "./planUtils.ts";
import { getMarketSnapshot } from "./marketSnapshot.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const textFields = (names: string[]) => Object.fromEntries(names.map((name) => [name, { type: "string" }]));
const indexProperties = { ticker: { type: "string", enum: ["QQQ", "SPY"] }, ...textFields(["weeklyBias", "dailyBias", "intradayBias", "marketEnvironment", "liquidityTarget", "gamePlan"]), mostImportantLevel: nullableNumber, bullTrigger: nullableNumber, bearTrigger: nullableNumber };
const watchlistNames = ["ticker", "weeklyBias", "dailyBias", "relativeStrength", "preferredDirection", "confidence", "longPlan", "longTrigger", "longInvalidation", "shortPlan", "shortTrigger", "shortInvalidation", "bottomLine"];
const watchlistProperties = { ...textFields(watchlistNames), majorSupport: nullableNumber, majorResistance: nullableNumber, dataAvailable: { type: "boolean" }, longScenarioEnabled: { type: "boolean" }, shortScenarioEnabled: { type: "boolean" } };
const schema = { type: "object", additionalProperties: false, required: ["overall", "indexes", "watchlist"], properties: {
  overall: { type: "object", additionalProperties: false, required: ["marketCondition", "expectedTradingDay", "notes"], properties: textFields(["marketCondition", "expectedTradingDay", "notes"]) },
  indexes: { type: "array", minItems: 2, maxItems: 2, items: { type: "object", additionalProperties: false, required: Object.keys(indexProperties), properties: indexProperties } },
  watchlist: { type: "array", maxItems: 10, items: { type: "object", additionalProperties: false, required: Object.keys(watchlistProperties), properties: watchlistProperties } },
} };

const systemPrompt = `You are a professional proprietary-trading preparation assistant creating an initial structural plan from higher-timeframe and prior regular-session data only. Create conditional execution scenarios, never predictions or orders. Analyze QQQ and SPY first, then every requested stock. Use the supplied deterministic weekly/daily trends and majorSupport/majorResistance. Echo numeric majorSupport and majorResistance unchanged; never invent numeric levels. Use IF price does X, THEN consider Y language without certainty. Every enabled thesis needs an invalidation. Confidence must be Low, Medium, or High. Preferred direction must be Long, Short, Both, or Neutral. Do not mention or infer PMH, PML, ATH, premarket strength, gaps, overnight structure, extended-hours volume, or live premarket relative strength. For dataAvailable=false disable both scenarios and say Data unavailable in the bottom line.`;

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
    const twelveKey = Deno.env.get("TWELVE_DATA_API_KEY"), openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!twelveKey) return reply({ error: "Twelve Data is not configured.", code: "TWELVE_DATA_NOT_CONFIGURED" }, 500);
    if (!openAiKey) return reply({ error: "OpenAI is not configured.", code: "OPENAI_NOT_CONFIGURED" }, 500);
    const snapshots = await Promise.all(parsed.symbols.map((ticker) => getMarketSnapshot(ticker, parsed.tradeDate, twelveKey)));
    const contexts = snapshots.map((item) => item.context);
    if (!contexts.find((item) => item.ticker === "QQQ")?.dataAvailable || !contexts.find((item) => item.ticker === "SPY")?.dataAvailable) return reply({ error: "QQQ and SPY market data are required to generate a market-first plan.", code: "REQUIRED_MARKET_DATA_UNAVAILABLE", warnings: snapshots.map((item) => item.warning).filter(Boolean) }, 502);
    const model = Deno.env.get("OPENAI_PREMARKET_MODEL") || "gpt-5-mini";
    const aiResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, instructions: systemPrompt, input: JSON.stringify({ tradeDate: parsed.tradeDate, marketData: contexts }), text: { format: { type: "json_schema", name: "premarket_plan", strict: true, schema } } }) });
    if (aiResponse.status === 429) return reply({ error: "OpenAI rate limit reached. Try again later.", code: "OPENAI_RATE_LIMIT" }, 429);
    if (!aiResponse.ok) { console.error("OpenAI request failed", aiResponse.status); return reply({ error: "AI analysis failed.", code: "OPENAI_FAILURE" }, 502); }
    const responsePayload = await aiResponse.json();
    let outputText = typeof responsePayload.output_text === "string" ? responsePayload.output_text : "";
    if (!outputText && Array.isArray(responsePayload.output)) for (const output of responsePayload.output) if (Array.isArray(output.content)) for (const content of output.content) if (content?.type === "output_text" && typeof content.text === "string") outputText = content.text;
    let draft: any; try { draft = validateDraft(JSON.parse(outputText), parsed.tickers); } catch (error) { console.error("Invalid structured response", error); return reply({ error: "AI returned an invalid structured response.", code: "INVALID_AI_RESPONSE" }, 502); }
    const byTicker = Object.fromEntries(contexts.map((item) => [item.ticker, item]));
    draft.indexes = draft.indexes.map((item: Record<string, unknown>) => ({ ...item, levels: { pdh: byTicker[item.ticker as string]?.previousDayHigh ?? null, pdl: byTicker[item.ticker as string]?.previousDayLow ?? null, pmh: null, pml: null } }));
    draft.watchlist = draft.watchlist.map((item: Record<string, unknown>) => { const source = byTicker[item.ticker as string]; return { ...item, majorSupport: source?.majorSupport ?? null, majorResistance: source?.majorResistance ?? null, relativeStrength: item.dataAvailable === false ? item.relativeStrength : `Recent regular-session: ${String(item.relativeStrength || "Neutral vs QQQ/SPY")}`, levels: { pdh: source?.previousDayHigh ?? null, pdl: source?.previousDayLow ?? null, majorSupport: source?.majorSupport ?? null, majorResistance: source?.majorResistance ?? null, atr: source?.atr ?? null } }; });
    const now = new Date().toISOString();
    return reply({ ...draft, warnings: snapshots.map((item) => item.warning).filter(Boolean), metadata: { generatedAt: now, dataAsOf: now, tickersAnalyzed: parsed.symbols, model, promptVersion: PROMPT_VERSION, premarketDataIncluded: false } });
  } catch (error) { console.error("generate-premarket-plan failed", error); return reply({ error: "AI plan generation is temporarily unavailable.", code: "GENERATION_FAILURE" }, 500); }
});
