# Phase 3C Break & Retest review

Phase 3C stores structured review evidence without grading, approving, rejecting, or recommending trades. Historical three-state fields remain `null` (Unknown) until reviewed.

## Automatically calculated

`distance_to_next_level` is calculated from the imported entry and reviewed next-level price:

- Long: next level minus entry
- Short: entry minus next level

A negative directional distance is stored as `null`, not as valid room. `distance_to_next_level_r` is calculated when risk per share is available, using actual stop first and planned stop as a fallback. Both values are recalculated in the trade service when the next-level price, actual stop, or planned stop changes.

## Manually reviewed

All setup structure, displacement, retest, volume, QQQ/SPY alignment, overall alignment, room assessment, extension, opening context, entry evidence, rule violations, notes, and the Rule Adherence Score are manual.

`entered_after_first_5min` remains manual in Phase 3C. Existing persisted `entry_time` values are display-oriented and are not consistently timezone-qualified, so deriving historical values would risk misclassification. `first_5min_break` is also manual as required.

No Phase 3C field automatically changes Setup Quality, Execution Quality, Execution Score, P&L classification, or any existing analytics.
