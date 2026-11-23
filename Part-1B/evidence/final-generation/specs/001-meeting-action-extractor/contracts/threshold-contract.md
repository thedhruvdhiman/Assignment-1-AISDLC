# EVAL-1 Threshold Contract

The evaluator-owned `.harness/threshold.json` must encode exactly these
specification values. A difference from this contract is a failed evaluation
setup, not an opportunity to adjust the threshold.

```json
{
  "evaluationId": "EVAL-1",
  "caseCount": 22,
  "minimumCasesPerCategory": 2,
  "semanticThresholdPercent": 90.0,
  "caseScore": {
    "categories": [
      "actionItemSemanticUnits",
      "decisionSemanticUnits",
      "annotatedSummaryFacts",
      "requiredClarificationNeeds"
    ],
    "weights": {
      "actionItemSemanticUnits": 0.25,
      "decisionSemanticUnits": 0.25,
      "annotatedSummaryFacts": 0.25,
      "requiredClarificationNeeds": 0.25
    },
    "categoryMetric": "F1",
    "emptyExpectedAndProducedScore": 1.0,
    "exactlyOneOfExpectedOrProducedEmptyScore": 0.0,
    "bothPrecisionAndRecallZeroScore": 0.0
  },
  "aggregate": "unweighted arithmetic mean of successful-extraction case scores, percentage rounded to one decimal place",
  "hardGates": [
    "all successful-extraction cases pass schema validation",
    "all applicable invariants and guardrails pass",
    "controlled service-failure cases raise the expected ModelServiceError",
    "unexpected service failures do not produce PASS"
  ]
}
```

For each semantic category, precision is matched produced units divided by all
produced units; recall is matched expected units divided by all expected units;
F1 is `2 * precision * recall / (precision + recall)`. The four category
scores are weighted equally at 0.25. Controlled service-failure cases test the
error contract and are excluded from the semantic aggregate.

Requirement mapping: FR-013–FR-016; SC-001–SC-002, SC-006.
