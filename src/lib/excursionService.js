import { calculateExcursionsFromCandles } from "./excursionEngine";
import { getIntradayCandles } from "./marketDataService";
import { buildTradeMarketDataRequest } from "./marketTime";

export async function calculateTradeExcursions(trade) {
  const candles = await getIntradayCandles(buildTradeMarketDataRequest(trade));

  return calculateExcursionsFromCandles(trade, candles);
}
