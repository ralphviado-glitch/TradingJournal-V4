export const WORKFLOW_STATUS_VALUES = {
  processing_status: ["Pending", "Processing", "Complete", "Partial", "Failed"],
  excursion_status: ["Pending", "Calculated", "Unavailable", "Failed"],
  management_status: ["Derived", "Manual Review", "Not Applicable", "Failed"],
  watchlist_match_status: ["Matched", "No Match", "Ambiguous", "Not Checked"],
  review_status: ["Not Reviewed", "Partially Reviewed", "Review Complete"],
};

export function validateWorkflowStatuses(values = {}) {
  Object.entries(WORKFLOW_STATUS_VALUES).forEach(([field, allowed]) => {
    if (values[field] != null && values[field] !== "" && !allowed.includes(values[field])) {
      throw new Error(`Invalid ${field}: ${values[field]}`);
    }
  });
  return true;
}
