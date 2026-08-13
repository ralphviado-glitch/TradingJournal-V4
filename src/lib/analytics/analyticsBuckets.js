export const ROOM_R_BUCKETS = [
  { label: "< 1R", test: (value) => value < 1 },
  { label: "1R – 1.5R", test: (value) => value >= 1 && value < 1.5 },
  { label: "1.5R – 2R", test: (value) => value >= 1.5 && value < 2 },
  { label: "2R – 3R", test: (value) => value >= 2 && value < 3 },
  { label: "3R+", test: (value) => value >= 3 },
];

export const EXIT_EFFICIENCY_BUCKETS = [
  { label: "< 25%", test: (value) => value < 25 },
  { label: "25–50%", test: (value) => value >= 25 && value < 50 },
  { label: "50–75%", test: (value) => value >= 50 && value < 75 },
  { label: "75–90%", test: (value) => value >= 75 && value < 90 },
  { label: "90–100%", test: (value) => value >= 90 && value <= 100 },
];

export const RULE_ADHERENCE_BUCKETS = [
  { label: "0–59", test: (value) => value >= 0 && value < 60 },
  { label: "60–74", test: (value) => value >= 60 && value < 75 },
  { label: "75–84", test: (value) => value >= 75 && value < 85 },
  { label: "85–94", test: (value) => value >= 85 && value < 95 },
  { label: "95–100", test: (value) => value >= 95 && value <= 100 },
];

export function bucketValue(value, buckets, unknownLabel = "Unknown") {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return unknownLabel;
  return buckets.find((bucket) => bucket.test(Number(value)))?.label || unknownLabel;
}

export function getSampleSizeLabel(count) {
  if (count <= 0) return "No Sample";
  if (count <= 4) return "Very Low Sample";
  if (count <= 9) return "Low Sample";
  if (count <= 19) return "Developing";
  return "More Meaningful";
}

