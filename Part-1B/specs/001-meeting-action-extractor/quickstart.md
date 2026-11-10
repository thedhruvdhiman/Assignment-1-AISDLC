# Quickstart: Meeting Action Extractor Validation

This guide validates the planned function and independent evaluator. It does
not implement the application or change protected evaluator artifacts.

## Prerequisites

- Node.js 20 or later.
- The approved feature spec, plan, and tasks.
- Evaluator-owner-provided `evals/dataset.json` (exactly 22 cases), `.harness/`
  files, `tests/harness.selfcheck.test.js`, and `package.json`/lock file.
- `package.json` declares `"type": "module"` and the Ajv dependency required
  for JSON Schema 2020-12 validation.
- `MEETING_PROVIDER=openai`, a supported `MEETING_MODEL`,
  `MEETING_TEMPERATURE` (0.0–0.2 and accepted by that model), and
  `OPENAI_API_KEY` are set in the environment. Never place credential values
  in commands, source files, fixtures, logs, or reports.

## Validate Evaluator Self-Checks

```sh
node --test tests/harness.selfcheck.test.js
```

Expected: all HR-11 tests pass. A failing self-check blocks evaluation and
must not be skipped, weakened, or deleted.

## Run the Frozen 22-Case Evaluation

```sh
node .harness/run_eval.mjs --lock --snapshot baseline
```

Expected: one report per case, schema and invariant results, semantic scores
for successful-extraction cases, a 0.0–100.0 aggregate compared to the
90.0% threshold, and an overall PASS or FAIL. A controlled service-failure
case passes only when `ModelServiceError` is raised as specified. Unexpected
provider failures are reported separately and prevent PASS.

## Check Repeatability and Save Outputs

```sh
node .harness/run_eval.mjs --lock --repeats 3 --snapshot repeatability --outputs evidence/repeatability.json
```

Expected: the 22 fixed cases are repeated three times; all structural and
invariant gates remain mandatory for every successful extraction. The output
file and snapshot preserve first-generation results and structured failure
evidence. The harness must report service failures separately.

## Manual Contract Scenarios

When running a single case through the function or evaluator:

1. Provide an explicit commitment with an accepted named owner and definite
   deadline; confirm one schema-valid response and a contiguous source quote.
2. Provide a vague deadline or no accepted owner; confirm the field is `null`,
   `needs_clarification` is `true`, and an indexed question is present.
3. Include a transcript date and a relative deadline; confirm the date rule in
   FR-024 is applied, while vague phrases remain unresolved.
4. Include an injected instruction or sensitive span; confirm the instruction
   is not followed/echoed and sensitive values do not occur anywhere in the
   response.
5. Simulate a provider timeout/rate limit; confirm `ModelServiceError` is
   raised and no empty JSON response is reported.

See the [function contract](./contracts/function-contract.md),
[SCH-1](./contracts/response.schema.json), and
[evaluator contract](./contracts/evaluator-contract.md) for exact behavior.
