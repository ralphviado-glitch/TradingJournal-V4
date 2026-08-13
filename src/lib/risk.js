export const DEFAULT_RISK_CONTROLS = {
  standardRisk: 100,
  reducedRisk: 50,
  maxTrades: 2,
  dailyLossLimit: 200,
};

function toPositiveNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

export function calculatePositionSize({
  direction = "Long",
  entryPrice,
  stopPrice,
  standardRisk = DEFAULT_RISK_CONTROLS.standardRisk,
  reducedRisk = DEFAULT_RISK_CONTROLS.reducedRisk,
}) {
  const entry = toPositiveNumber(entryPrice);
  const stop = toPositiveNumber(stopPrice);
  const standard = toPositiveNumber(standardRisk);
  const reduced = toPositiveNumber(reducedRisk);

  if (!entry || !stop || !standard || !reduced || entry === stop) {
    return {
      isValid: false,
      stopDistance: 0,
      sharesAtStandardRisk: 0,
      sharesAtReducedRisk: 0,
      oneRPrice: 0,
      twoRPrice: 0,
    };
  }

  const stopDistance = Math.abs(entry - stop);
  const riskDirection = direction === "Short" ? -1 : 1;

  return {
    isValid: true,
    stopDistance: Number(stopDistance.toFixed(2)),
    sharesAtStandardRisk: Math.floor(standard / stopDistance),
    sharesAtReducedRisk: Math.floor(reduced / stopDistance),
    oneRPrice: Number((entry + riskDirection * stopDistance).toFixed(2)),
    twoRPrice: Number((entry + riskDirection * stopDistance * 2).toFixed(2)),
  };
}
