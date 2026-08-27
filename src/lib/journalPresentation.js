export const formatJournalPrice = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  const number = Number(value);
  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
};

export const journalReviewLabel = (status) => {
  if (["Reviewed", "Review Complete"].includes(status)) return "Yes";
  if (["Partially Reviewed", "In Progress"].includes(status)) return "Partial";
  return "No";
};

export const journalReviewStatus = (trade, calculatedStatus) =>
  ["Reviewed", "Review Complete", "Partially Reviewed", "In Progress"].includes(trade?.review_status)
    ? trade.review_status
    : calculatedStatus;
