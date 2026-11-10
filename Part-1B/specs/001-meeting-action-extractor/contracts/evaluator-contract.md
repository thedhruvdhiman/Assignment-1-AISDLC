# Independent Evaluator Contract

## Ownership and Isolation

`evals/dataset.json`, all `.harness/` files, `tests/harness.selfcheck.test.js`,
`package.json`, the lock file, and generated `evidence/` are protected
acceptance artifacts. The coding agent does not author or modify them during
Phase 2. They are provided/maintained by the independent evaluator owner.

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
node .harness/run_eval.mjs [--outputs FILE] [--repeats N] [--lock] [--snapshot NAME]
```

- `--outputs FILE`: write the machine-readable run report to the requested
  output path in addition to the required evidence record.
- `--repeats N`: run each successful-extraction case N times to measure
  bounded non-determinism; each run still must pass structural and invariant
  gates.
- `--lock`: verify the evaluator inputs are frozen against their recorded
  hashes before running; fail closed if locked inputs differ.
- `--snapshot NAME`: preserve named run outputs, including first-generation
  output, before any repair.

Exact option validation and report fields are implemented and self-checked by
the protected harness. CLI misuse is an evaluation invocation failure, never a
PASS.

## Requirement Mapping

The CLI and pipeline serve FR-013–FR-018 and SC-001–SC-007. The self-check
suite is HR-11. The harness's per-file requirement mapping is in
[requirements-map.md](./requirements-map.md).
