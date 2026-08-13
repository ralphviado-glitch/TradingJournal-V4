import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildTwelveDataUrl,
  MarketDataFunctionError,
  normalizeTwelveDataResponse,
  validateMarketDataRequest,
} from "./marketData.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof MarketDataFunctionError) {
    return jsonResponse({ error: error.message, code: error.code }, error.status);
  }

  return jsonResponse(
    { error: "Market data service is temporarily unavailable.", code: "MARKET_DATA_UNAVAILABLE" },
    503
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");

    if (!apiKey) {
      throw new MarketDataFunctionError(
        "Market data service is not configured.",
        "MISSING_API_KEY",
        500
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    if (!jwt) {
      throw new MarketDataFunctionError("Authentication required.", "UNAUTHENTICATED", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new MarketDataFunctionError(
        "Market data service is not configured.",
        "MISSING_SUPABASE_CONFIG",
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !userData?.user) {
      throw new MarketDataFunctionError("Authentication required.", "UNAUTHENTICATED", 401);
    }

    const requestBody = await req.json();
    const marketDataRequest = validateMarketDataRequest(requestBody);
    const twelveDataUrl = buildTwelveDataUrl(marketDataRequest, apiKey);
    const response = await fetch(twelveDataUrl);

    if (!response.ok) {
      if (response.status === 429) {
        throw new MarketDataFunctionError("Rate limited.", "RATE_LIMIT", 429);
      }

      throw new MarketDataFunctionError("Upstream request failed.", "UPSTREAM_ERROR", 502);
    }

    const payload = await response.json();
    const candles = normalizeTwelveDataResponse(payload);

    return jsonResponse({
      ticker: marketDataRequest.ticker,
      interval: marketDataRequest.interval,
      timezone: "America/New_York",
      candles,
    });
  } catch (error) {
    console.error("Market data function failed:", error instanceof Error ? error.name : "Unknown");
    return errorResponse(error);
  }
});
