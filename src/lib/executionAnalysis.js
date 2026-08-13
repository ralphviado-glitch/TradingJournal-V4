function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function calculateDeviation(actual, planned) {
  const actualNumber = toNullableNumber(actual);
  const plannedNumber = toNullableNumber(planned);

  if (actualNumber === null || plannedNumber === null) {
    return null;
  }

  return Number((actualNumber - plannedNumber).toFixed(2));
}

export function calculateEntryDeviation({ planned_entry, actual_entry }) {
  return calculateDeviation(actual_entry, planned_entry);
}

export function calculateImportedEntryDeviation({ planned_entry, entry_price, actual_entry }) {
  return calculateDeviation(entry_price ?? actual_entry, planned_entry);
}

export function calculateStopDeviation({ planned_stop, actual_stop }) {
  return calculateDeviation(actual_stop, planned_stop);
}

export function calculateTargetDeviation({ planned_target, actual_exit }) {
  return calculateDeviation(actual_exit, planned_target);
}

export function calculateImportedTargetDeviation({ planned_target, exit_price, actual_exit }) {
  return calculateDeviation(exit_price ?? actual_exit, planned_target);
}

export function calculateExitEfficiency({ realizedProfit, mfe }) {
  const realized = toNullableNumber(realizedProfit);
  const mfeProfit = toNullableNumber(mfe);

  if (realized === null || mfeProfit === null || mfeProfit <= 0) {
    return null;
  }

  const efficiency = (realized / mfeProfit) * 100;
  const clamped = Math.min(100, Math.max(0, efficiency));

  return Number(clamped.toFixed(1));
}

export function calculateMoveExitEfficiency({ realizedMove, mfePerShare }) {
  const realized = toNullableNumber(realizedMove);
  const mfe = toNullableNumber(mfePerShare);

  if (realized === null || mfe === null || mfe <= 0) {
    return null;
  }

  return Number(Math.min(100, Math.max(0, (realized / mfe) * 100)).toFixed(1));
}

export function getExitEfficiencyRating(value) {
  const efficiency = toNullableNumber(value);

  if (efficiency === null) return "N/A";
  if (efficiency >= 90) return "Excellent";
  if (efficiency >= 75) return "Good";
  if (efficiency >= 50) return "Average";

  return "Poor";
}

export function getExecutionAnalysis(trade) {
  if (!trade) {
    return {
      entryDeviation: null,
      stopDeviation: null,
      targetDeviation: null,
      exitEfficiency: null,
      exitEfficiencyRating: "N/A",
    };
  }

  const exitEfficiency =
    toNullableNumber(trade.exit_efficiency) ??
    calculateExitEfficiency({
      realizedProfit: trade.pnl,
      mfe: trade.mfe_dollars ?? trade.mfe,
    });

  return {
    entryDeviation: calculateImportedEntryDeviation(trade),
    stopDeviation: calculateStopDeviation(trade),
    targetDeviation: calculateImportedTargetDeviation(trade),
    exitEfficiency,
    exitEfficiencyRating: getExitEfficiencyRating(exitEfficiency),
  };
}

export function parseExecutionNumber(value) {
  return toNullableNumber(value);
}
