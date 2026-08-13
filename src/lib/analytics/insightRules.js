export const INSIGHT_RULES = {
  minimumPromotedSample: 5,
  recentWindowSize: 20,
  ruleAdherentThreshold: 85,
  maximumVisibleInsights: 8,
  trendThresholds: {
    winRate: { improve: 5, deteriorate: -5 },
    averagePnl: { improve: 10, deteriorate: -10 },
    averageRuleAdherence: { improve: 5, deteriorate: -5 },
    averageExecutionScore: { improve: 5, deteriorate: -5 },
    averageExitEfficiency: { improve: 5, deteriorate: -5 },
    goodProcessPercentage: { improve: 5, deteriorate: -5 },
    averageMfeR: { improve: 0.25, deteriorate: -0.25 },
    averageMaeR: { improve: 0.25, deteriorate: -0.25 },
  },
};

export const EXECUTION_LEAK_CANDIDATES = [
  "Chased Entry", "Anticipation Entry", "Entered Extended", "Entered Before 5 Minutes",
  "No Proper Retest", "Against QQQ", "Against SPY", "Poor Stop Placement", "Early Exit",
  "Moved Stop", "Oversized Position", "Broke Risk Limit", "FOMO", "Revenge Trade",
];

