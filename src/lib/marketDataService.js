import { supabase } from "./supabase";

export class MarketDataProviderNotConfiguredError extends Error {
  constructor() {
    super("Market data service is not configured.");
    this.name = "MarketDataProviderNotConfiguredError";
  }
}

export class MarketDataServiceError extends Error {
  constructor(message, code = "MARKET_DATA_ERROR") {
    super(message);
    this.name = "MarketDataServiceError";
    this.code = code;
  }
}

export class MockMarketDataProvider {
  constructor(candles = []) {
    this.candles = candles;
  }

  async getIntradayCandles() {
    return this.candles;
  }
}

async function mapFunctionError(error) {
  let responseBody = null;

  if (error?.context && typeof error.context.json === "function") {
    try {
      responseBody = await error.context.json();
    } catch {
      responseBody = null;
    }
  }

  const code = responseBody?.code || error?.code;

  if (code === "MISSING_API_KEY") {
    return new MarketDataProviderNotConfiguredError();
  }

  if (code === "NO_BARS") {
    return new MarketDataServiceError(
      "No 1-minute market data was returned for this trade.",
      code
    );
  }

  if (code === "RATE_LIMIT") {
    return new MarketDataServiceError(
      "Market data request limit reached. Try again later.",
      code
    );
  }

  if (code === "UNAUTHENTICATED") {
    return new MarketDataServiceError("Sign in again to request market data.", code);
  }

  if (code === "INVALID_REQUEST") {
    return new MarketDataServiceError(
      "Trade timestamps could not be used for market data.",
      code
    );
  }

  return new MarketDataServiceError(
    "Market data service is temporarily unavailable.",
    code || "MARKET_DATA_UNAVAILABLE"
  );
}

class SupabaseFunctionMarketDataProvider {
  async getIntradayCandles(request) {
    const { data, error } = await supabase.functions.invoke("market-data", {
      body: request,
    });

    if (error) {
      throw await mapFunctionError(error);
    }

    if (!data?.candles || !Array.isArray(data.candles)) {
      throw new MarketDataServiceError(
        "Market data service returned an unexpected response.",
        "MALFORMED_RESPONSE"
      );
    }

    return data.candles;
  }
}

let activeProvider = new SupabaseFunctionMarketDataProvider();

export function setMarketDataProvider(provider) {
  activeProvider = provider || new SupabaseFunctionMarketDataProvider();
}

export function resetMarketDataProvider() {
  activeProvider = new SupabaseFunctionMarketDataProvider();
}

export async function getIntradayCandles(request) {
  return activeProvider.getIntradayCandles(request);
}
