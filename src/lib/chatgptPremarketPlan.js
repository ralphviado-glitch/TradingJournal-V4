import { supabase } from "./supabase";
import { AI_CONFIDENCE_OPTIONS, AI_DIRECTION_OPTIONS, AI_TICKER_LIMIT, normalizeAiTickers } from "./aiPremarketPlan";

export const CHATGPT_PREMARKET_PROMPT_VERSION = "premarket-v2";
const BIASES = new Set(["Bullish", "Bearish", "Neutral", "Mixed"]);
const RETIRED_FIELDS = ["intradayBias", "rating", "longTarget", "shortTarget"];

export async function preparePremarketData({ tradeDate, tickers }) {
  const { data, error } = await supabase.functions.invoke("prepare-premarket-data", { body: { tradeDate, tickers: normalizeAiTickers(tickers) } });
  if (error) {
    let body;
    try { body = await error.context?.json(); } catch { body = null; }
    throw new Error(body?.error || "Market data preparation failed.");
  }
  return data;
}

export const CHATGPT_PREMARKET_INSTRUCTIONS = `You are preparing a professional proprietary-trading pre-market plan.

Do not predict. Create conditional execution scenarios using market structure, weekly/daily trend, liquidity, recent regular-session relative strength/weakness, expansion potential, risk versus reward, institutional price action, break and retest, displacement, retest quality, and QQQ/SPY correlation.

Analyze QQQ and SPY first, then every watchlist ticker. Use the deterministic weekly and daily biases supplied in the market data. Do not create an intraday bias or price targets. For each ticker provide independent LONG and SHORT scenarios when valid. Use IF price does THIS, THEN execute THIS. Keep Long Plan, Short Plan, Relative Strength/Weakness, and Bottom Line concise.

Do not invent PMH/PML, gaps, overnight structure, premarket volume, or premarket behavior. Numeric PDH/PDL and structural Major Support/Major Resistance supplied in the market data are deterministic and must be echoed unchanged.`;

export function buildChatGPTPackage(snapshot) {
  const contract = { version: CHATGPT_PREMARKET_PROMPT_VERSION, tradeDate: snapshot.tradeDate, dataAsOf: snapshot.metadata.dataAsOf, premarketDataIncluded: false,
    overallMarket: { marketCondition: "", expectedTradingDay: "", generalMarketNotes: "" },
    qqq: { weeklyBias: "Neutral", dailyBias: "Neutral", marketEnvironment: "", pdh: null, pdl: null, liquidityTarget: "", mostImportantLevel: null, bullTrigger: null, bearTrigger: null, gamePlan: "" },
    spy: { weeklyBias: "Neutral", dailyBias: "Neutral", marketEnvironment: "", pdh: null, pdl: null, liquidityTarget: "", mostImportantLevel: null, bullTrigger: null, bearTrigger: null, gamePlan: "" },
    watchlist: [{ ticker: "NVDA", weeklyBias: "Bullish", dailyBias: "Bullish", relativeStrength: "RS vs QQQ", preferredDirection: "Long", confidence: "High", majorSupport: null, majorResistance: null, longScenarioEnabled: true, longPlan: "", longTrigger: "", longInvalidation: "", shortScenarioEnabled: true, shortPlan: "", shortTrigger: "", shortInvalidation: "", bottomLine: "" }] };
  return `TRADING JOURNAL PRE-MARKET ANALYSIS PACKAGE

PROMPT VERSION: ${CHATGPT_PREMARKET_PROMPT_VERSION}
TRADING DATE: ${snapshot.tradeDate}
GENERATED AT: ${snapshot.metadata.generatedAt}
DATA AS OF: ${snapshot.metadata.dataAsOf}
PREMARKET DATA INCLUDED: NO

=== INSTRUCTIONS FOR CHATGPT ===
${CHATGPT_PREMARKET_INSTRUCTIONS}

Return exactly two parts:
PART 1: Readable Pre-Market Report
PART 2: TRADING_JOURNAL_JSON

After the readable report, output one valid JSON object inside a single code block marked json. Do not include comments inside the JSON. Do not rename fields. Do not omit required top-level objects. Confidence must be Low, Medium, or High. Preferred Direction must be Long, Short, Both, or Neutral. Bias fields must be Bullish, Bearish, Neutral, or Mixed. When a supplied deterministic trend is Unavailable, use Unavailable for that bias instead of fabricating one.

Required JSON contract example (replace example values; include every selected ticker):
${JSON.stringify(contract, null, 2)}

=== STRUCTURED MARKET DATA ===
${JSON.stringify({ tradeDate: snapshot.tradeDate, generatedAt: snapshot.metadata.generatedAt, dataAsOf: snapshot.metadata.dataAsOf, premarketDataIncluded: false, symbols: snapshot.marketData }, null, 2)}`;
}

export function extractChatGPTJson(input) {
  const text = String(input || "").trim();
  if (!text) throw new Error("Paste the Trading Journal JSON returned by ChatGPT.");
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  if (blocks.length > 1) throw new Error("Multiple JSON code blocks found. Paste only one Trading Journal JSON object.");
  const candidate = blocks.length === 1 ? blocks[0] : text;
  try { const parsed = JSON.parse(candidate); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(); return parsed; }
  catch { throw new Error(blocks.length ? "The JSON code block is malformed." : "No valid JSON object found."); }
}

export function getPlanDateMismatchMessage(importedDate, selectedDate) {
  return importedDate && selectedDate && importedDate !== selectedDate ? `This ChatGPT plan is for ${importedDate}, but you are viewing ${selectedDate}.` : "";
}

function requiredString(value, label) { if (typeof value !== "string") throw new Error(`${label} must be a string.`); return value; }
function nullableNumber(value, label) { if (value === null) return null; if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a number or null.`); return value; }
function validateBias(value, label, deterministic) {
  if (deterministic === "Unavailable") {
    if (value !== "Unavailable") throw new Error(`${label} must be Unavailable because the supplied history is insufficient.`);
    return value;
  }
  if (!BIASES.has(value)) throw new Error(`Invalid ${label}.`);
  return deterministic || value;
}
function rejectRetiredFields(value, label) {
  const retired = RETIRED_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(value, field));
  if (retired) throw new Error(`${label} contains retired V1.2.4 field ${retired}. Generate a new pre-market-v2 plan.`);
}
function validateIndex(value, ticker, deterministic) {
  if (!value || typeof value !== "object") throw new Error(`Missing ${ticker} analysis.`);
  rejectRetiredFields(value, ticker);
  for (const field of ["marketEnvironment", "liquidityTarget", "gamePlan"]) requiredString(value[field], `${ticker} ${field}`);
  return { ticker, weeklyBias: validateBias(value.weeklyBias, `${ticker} weeklyBias`, deterministic?.weeklyTrend), dailyBias: validateBias(value.dailyBias, `${ticker} dailyBias`, deterministic?.dailyTrend), marketEnvironment: value.marketEnvironment, liquidityTarget: value.liquidityTarget,
    mostImportantLevel: nullableNumber(value.mostImportantLevel, `${ticker} mostImportantLevel`), bullTrigger: nullableNumber(value.bullTrigger, `${ticker} bullTrigger`), bearTrigger: nullableNumber(value.bearTrigger, `${ticker} bearTrigger`), gamePlan: value.gamePlan,
    levels: { pdh: deterministic?.previousDayHigh ?? nullableNumber(value.pdh, `${ticker} pdh`), pdl: deterministic?.previousDayLow ?? nullableNumber(value.pdl, `${ticker} pdl`), pmh: null, pml: null } };
}

export function validateAndMapChatGPTPlan(plan, snapshot) {
  if (plan.version !== CHATGPT_PREMARKET_PROMPT_VERSION) throw new Error(`Unsupported plan version: ${plan.version || "missing"}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.tradeDate || "")) throw new Error("Invalid or missing trade date.");
  if (typeof plan.dataAsOf !== "string" || !Number.isFinite(Date.parse(plan.dataAsOf))) throw new Error("Invalid or missing dataAsOf timestamp.");
  if (plan.premarketDataIncluded !== false) throw new Error("Premarket data must be marked as not included.");
  if (!plan.overallMarket || typeof plan.overallMarket !== "object") throw new Error("Missing overall market analysis.");
  const sourceByTicker = Object.fromEntries((snapshot?.marketData || []).map((item) => [item.ticker, item]));
  const indexes = [validateIndex(plan.qqq, "QQQ", sourceByTicker.QQQ), validateIndex(plan.spy, "SPY", sourceByTicker.SPY)];
  if (!Array.isArray(plan.watchlist)) throw new Error("Watchlist must be an array.");
  if (plan.watchlist.length > AI_TICKER_LIMIT) throw new Error(`More than ${AI_TICKER_LIMIT} watchlist tickers.`);
  const tickers = plan.watchlist.map((item) => String(item?.ticker || "").trim().toUpperCase());
  if (new Set(tickers).size !== tickers.length) throw new Error("Duplicate ticker in imported watchlist.");
  if (normalizeAiTickers(tickers).length !== tickers.length) throw new Error("Invalid ticker in imported watchlist.");
  const watchlist = plan.watchlist.map((item, index) => {
    const ticker = tickers[index];
    rejectRetiredFields(item, ticker);
    if (!AI_DIRECTION_OPTIONS.includes(item.preferredDirection)) throw new Error(`Invalid Preferred Direction for ${ticker}.`);
    if (!AI_CONFIDENCE_OPTIONS.includes(item.confidence)) throw new Error(`Invalid confidence for ${ticker}.`);
    if (typeof item.longScenarioEnabled !== "boolean" || typeof item.shortScenarioEnabled !== "boolean") throw new Error(`Scenario flags for ${ticker} must be true or false.`);
    for (const field of ["relativeStrength", "longPlan", "longTrigger", "longInvalidation", "shortPlan", "shortTrigger", "shortInvalidation", "bottomLine"]) requiredString(item[field], `${ticker} ${field}`);
    const deterministic = sourceByTicker[ticker];
    const majorSupport = deterministic?.majorSupport ?? deterministic?.recentSupport ?? nullableNumber(item.majorSupport ?? null, `${ticker} majorSupport`);
    const majorResistance = deterministic?.majorResistance ?? deterministic?.recentResistance ?? nullableNumber(item.majorResistance ?? null, `${ticker} majorResistance`);
    return { ...item, ticker, majorSupport, majorResistance, dataAvailable: true, weeklyBias: validateBias(item.weeklyBias, `${ticker} weeklyBias`, deterministic?.weeklyTrend), dailyBias: validateBias(item.dailyBias, `${ticker} dailyBias`, deterministic?.dailyTrend), levels: { pdh: deterministic?.previousDayHigh ?? null, pdl: deterministic?.previousDayLow ?? null, majorSupport, majorResistance, atr: deterministic?.atr ?? null } };
  });
  return { overall: { marketCondition: requiredString(plan.overallMarket.marketCondition, "Market Condition"), expectedTradingDay: requiredString(plan.overallMarket.expectedTradingDay, "Expected Trading Day"), notes: requiredString(plan.overallMarket.generalMarketNotes, "General Market Notes") }, indexes, watchlist,
    metadata: { generatedAt: new Date().toISOString(), dataAsOf: requiredString(plan.dataAsOf, "dataAsOf"), tickersAnalyzed: ["QQQ", "SPY", ...tickers], model: null, promptVersion: CHATGPT_PREMARKET_PROMPT_VERSION, premarketDataIncluded: false, generationSource: "chatgpt_manual_import", importedTradeDate: plan.tradeDate } };
}
