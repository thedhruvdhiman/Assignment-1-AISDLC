# Independent Evaluator Contract

## Ownership and Isolation

`evals/dataset.json`, all `.harness/` files, `tests/harness.selfcheck.test.js`,
`package.json`, the lock file, and generated `evidence/` are protected
acceptance artifacts. The coding agent does not author or modify them during
Phase 2. The independent evaluator owner authors, validates, and locks them
during Phase 1; the application coding agent does not author or modify them.

The harness imports only:

```js
import { handle } from "../src/meeting_extractor/agent.js";
import { ModelServiceError } from "../src/meeting_extractor/errors.js";
```

It must not import other application code. It independently loads the dataset,
SCH-1, requirement catalog, and EVAL-1 threshold and runs:

`dataset -> application -> schema validation -> invariant/property checks -> semantic scoring -> aggregate vs threshold -> PASS/FAIL`

Controlled service-failure cases pass only when the expected
`ModelServiceError` is raised. Unexpected model-service failures are reported
separately and cannot yield PASS.

## Command-Line Interface

```text
node .harness/run_eval.mjs [--outputs FILE] [--replay FILE] [--repeats N] [--lock] [--snapshot NAME]
```

- `--outputs FILE`: write the machine-readable run report to the requested
  output path in addition to the required evidence record.
- `--replay FILE`: replay captured per-case model outcomes instead of making
  provider requests. The evaluator-owned file identifies each case and its
  captured model response or expected service error.
- `.harness/fixtures/ideal-output.json`: evaluator-owned, schema-conforming
  model-output fixture keyed by case ID. Pass this file to `--replay` for a
  deterministic self-check of the evaluator pipeline; it is not expected
  output hard-coded in application code and is not used as a live evaluation
  result.
- `--repeats N`: run each successful-extraction case N times to measure
  bounded non-determinism; each run still must pass structural and invariant
  gates.
- `--lock`: verify the evaluator inputs are frozen against their recorded
  SHA-256 hashes before running; fail closed if locked inputs differ. The lock
  covers the dataset, schema, requirements, threshold, evaluator modules,
  runner, fixtures, and self-check tests. The evaluator owner records the
  initial manifest in `.harness/input-lock.json` only after the self-check and
  ideal-output replay pass; later locked runs verify it without rewriting it.
- `--snapshot NAME`: preserve named run outputs, including first-generation
  output, before any repair.

Exact option validation and report fields are implemented and self-checked by
the protected harness. CLI misuse is an evaluation invocation failure, never a
PASS.

Each run result and each structured feedback record is appended as a
hash-chained JSON Lines record under `evidence/`. Each record includes the
previous record hash and its own SHA-256 digest over canonicalized record
content. A broken or missing link is an evaluation integrity failure.
First-generation output and feedback are preserved before any repair.

The evaluator owner must run both the HR-11 self-checks and an ideal-output
replay before declaring Phase 1 complete, then record the lock. The exact
fixture and report fields are defined and validated by the protected harness.
CLI misuse is an evaluation invocation failure, never a PASS.

## Requirement Mapping

The CLI and pipeline serve FR-013–FR-018 and SC-001–SC-007. The self-check
suite is HR-11. The harness's per-file requirement mapping is in
[requirements-map.md](./requirements-map.md).
