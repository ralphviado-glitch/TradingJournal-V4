function normalizedDirection(value) {
  const direction = String(value || "").trim().toLowerCase();
  return direction === "long" || direction === "short" ? direction : null;
}

export function preferredDirectionMatch(preferred, actual) {
  const planned = String(preferred || "").trim().toLowerCase();
  const actualDirection = normalizedDirection(actual);
  if (!actualDirection || !planned || planned === "neutral") return null;
  if (planned === "both") return true;
  return planned === actualDirection;
}

export function plannedScenarioMatch(plan, actual) {
  const actualDirection = normalizedDirection(actual);
  if (!actualDirection) return null;
  const field = actualDirection === "long" ? "long_scenario_enabled" : "short_scenario_enabled";
  if (!(field in (plan || {})) || plan[field] == null) return null;
  return plan[field] === true;
}

export function classifyPlanDirection({ preferredMatch, scenarioMatch }) {
  if (scenarioMatch == null) return "Unknown";
  if (scenarioMatch === false) return "Unplanned Direction";
  if (preferredMatch === true) return "Preferred Scenario";
  if (preferredMatch === false) return "Alternative Planned Scenario";
  return "Alternative Planned Scenario";
}

export function getPlanDirectionResult(plan, actual) {
  const preferredMatch = preferredDirectionMatch(plan?.direction, actual);
  const scenarioMatch = plannedScenarioMatch(plan, actual);
  return { preferredMatch, scenarioMatch, classification: classifyPlanDirection({ preferredMatch, scenarioMatch }) };
}
