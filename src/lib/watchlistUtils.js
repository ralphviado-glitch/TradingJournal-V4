export function sortWatchlistByPriority(items = []) {
  return [...items].sort((a, b) => {
    const priorityA = Number(a.priority || 0);
    const priorityB = Number(b.priority || 0);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const createdAtComparison = String(a.created_at || "").localeCompare(String(b.created_at || ""));

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return String(a.ticker || "").localeCompare(String(b.ticker || ""));
  });
}

export const structuredLevelFields = [
  "pmh",
  "pml",
  "pdh",
  "pdl",
  "ath",
  "major_support",
  "major_resistance",
  "atr",
];

export function parseNullablePrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function getAvailableWatchlistLevels(item = {}) {
  return [
    ["PMH", item.pmh],
    ["PML", item.pml],
    ["PDH", item.pdh],
    ["PDL", item.pdl],
    ["ATH", item.ath],
    ["Resistance", item.major_resistance],
    ["Support", item.major_support],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
}
