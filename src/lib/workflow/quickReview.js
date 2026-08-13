import { normalizeThreeState } from "../breakRetestReview";

export function createQuickReviewDraft(trade = {}) {
  return {
    setup_quality: trade.setup_quality || "",
    execution_quality: trade.execution_quality || "",
    break_retest_setup: trade.break_retest_setup === true ? "true" : trade.break_retest_setup === false ? "false" : "",
    rule_adherence_score: trade.rule_adherence_score ?? "",
    rule_violations: trade.rule_violations || [],
    setup_review_notes: trade.setup_review_notes || trade.notes || "",
    screenshotFile: null,
  };
}

export function buildQuickReviewPayload(draft) {
  return {
    setup_quality: draft.setup_quality,
    execution_quality: draft.execution_quality,
    break_retest_setup: normalizeThreeState(draft.break_retest_setup),
    rule_adherence_score: draft.rule_adherence_score,
    rule_violations: draft.rule_violations,
    setup_review_notes: draft.setup_review_notes,
    screenshotFile: draft.screenshotFile,
  };
}

function parseEntryClock(value = "") {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const period = match[4]?.toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return hour * 3600 + minute * 60 + second;
}

export function deriveEnteredAfterFirstFiveMinutes(trade = {}) {
  const firstFillUtc = trade.orders?.[0]?.timestampUtc;
  let clock = trade.entry_time;
  if (firstFillUtc) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(firstFillUtc)).map((part) => [part.type, part.value]));
    clock = `${parts.hour}:${parts.minute}:${parts.second}`;
  }
  const secondsAfterMidnight = parseEntryClock(clock);
  return secondsAfterMidnight === null ? null : secondsAfterMidnight >= 9 * 3600 + 35 * 60;
}
