# Implementation Plan: Meeting Action Extractor

**Branch**: `001-meeting-action-extractor` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Status**: Approved

**Input**: Feature specification from `/specs/001-meeting-action-extractor/spec.md`

## Summary

Implement one asynchronous Node.js function that extracts source-grounded
meeting tasks and decisions into the exact schema in the specification. A
versioned system prompt treats the transcript as untrusted data. The function
parses and validates model output, applies deterministic source, privacy,
assignee, deadline, limit, and clarification checks, then returns one object.
An independent evaluator runs the fixed 22-case dataset through structural,
invariant, semantic, and aggregate gates; service errors are reported
separately and cannot become empty successful extractions.

## Technical Context

**Language/Version**: Node.js 20+, ES modules (`"type": "module"`)

**Primary Dependencies**: Ajv's dedicated 2020-12 implementation in strict
mode; native Node.js `fetch` for the OpenAI Responses API; no provider SDK or
format plugin

**Storage**: No database or application persistence. Evaluation inputs are
versioned JSON files; generated reports and snapshots belong under `evidence/`.

**Testing**: `node:test`; `tests/harness.selfcheck.test.js` runs the HR-11
self-checks. The independent evaluator is invoked through
`.harness/run_eval.mjs`.

**Target Platform**: Node.js 20 or later on a developer or evaluation machine
with network access to the configured model service.

**Project Type**: Small ES module library with an independent evaluation
harness; no UI, database, or web framework.

**Performance Goals**: No latency or throughput SLO is specified. The
application makes one model request per call, without retries that could hide
service failures.

**Constraints**: Public entry point is
`handle(transcript, context = null) -> Promise<object>`. `context` may provide
`meetingDate` and `participants`. Configuration comes only from
`MEETING_PROVIDER=openai`, `MEETING_MODEL`, `MEETING_TEMPERATURE` (a value from
0.0 through 0.2 supported by the selected model), and `OPENAI_API_KEY`. Use
one provider integration. The Responses API request has a 30-second timeout
and no automatic retry. Input text is untrusted; output is schema-validated
and deterministically checked. No credentials, transcripts, or raw sensitive
values are written to files or logs.

**Scale/Scope**: One transcript or rough-notes string per invocation; action
and decision arrays are limited to 25 entries, while clarification questions
are not capped. The fixed evaluator dataset contains exactly 22 cases. This is
a local single-function project, not a hosted service.

## Constitution Check

**Pre-research gate: PASS, with protected-artifact ownership conditions.**

- The Draft feature specification exists and defines the output schema,
  numeric score formula, 90.0% threshold, 22-case dataset, security rules,
  clarification behavior, and error behavior before evaluation.
- Implementation remains blocked until `spec.md`, `plan.md`, and `tasks.md`
  have all been reviewed and approved.
- Each implementation task in `tasks.md` must repeat the complete FR-022 hard
  rules, including the Phase 2 path restrictions, protected tests/evaluator/
  manifest artifacts, no bypasses or skipped cases, secret prohibition, and
  stop-and-report rule.
- The coding agent's Phase 2 edits are confined to `src/` and `prompts/`.
  The independent evaluator, its dataset, schema, requirements, threshold,
  self-check tests, package manifest, lock file, and generated evidence are
  authored and locked by the independent evaluator owner in Phase 1. The
  application coding agent may execute the harness in Phase 2 but MUST NOT
  author, change, weaken, skip, or delete those artifacts.
- Phase 1 is the evaluator-owner-only harness and dataset phase. It ends with
  passing harness self-checks and an ideal-output replay, followed by the
  recorded lock of evaluator inputs. **Phase 1 complete - lock before Phase 2**
  is a mandatory stop: no application task starts until the owner confirms the
  lock. Phase 2 is application-only and may modify only `src/` and `prompts/`.
- Since `handle()` validates against SCH-1 and imports Ajv, Ajv must be
  provisioned as a dependency before Phase 2 by the project owner. The
  requested development-only dependency is suitable for this local evaluation
  project; no production deployment omitting development dependencies is
  assumed.
- The harness imports only `handle` and `ModelServiceError` from application
  code. The harness independently validates returned data and does not import
  application post-check helpers.
- The Phase 1 harness supports live execution and replay from a supplied
  ideal-output fixture, repeated runs, locked-input hash verification, named
  snapshots, and hash-chained result and structured-feedback records. Replay
  exists to validate the evaluator pipeline; it is not an application
  fallback or a replacement for live evaluation.
- API keys are read only from environment variables. Application code uses no
  `eval`, `new Function`, or shell execution.
- No UI, database, or web framework is introduced.

## Research and Design Decisions

Research for Node's test/runtime behavior, Ajv's 2020-12 support, and the
provider request/error contract is recorded in [research.md](./research.md).
The implementation uses only native `fetch` to call the OpenAI Responses API
at `https://api.openai.com/v1/responses`, avoiding a provider SDK. The only
accepted provider value is `openai`; `MEETING_MODEL` must name a model that
supports the configured low temperature.

The canonical SCH-1 is the evaluator-owned `.harness/response.schema.json`.
The application loads that schema as a read-only contract and validates both
the parsed response and the deterministic post-checked response. This keeps
one schema definition while preserving evaluator independence: the evaluator
also validates its observation independently.

Sensitive-span redaction uses the exact marker `[REDACTED]`. A quote is
accepted only if it corresponds to one contiguous transcript span after the
same redaction rule is applied; matching is not weakened to accept fabricated
or non-contiguous text. Past-deadline checks compare only with the resolved
meeting date, never the machine's current date.

**Post-design gate: PASS for planning; implementation remains blocked until
the Draft spec, this plan, and tasks are reviewed and approved, and the same
external ownership conditions are met.** The design preserves a single application function,
independent evaluation, all protected acceptance criteria, Phase 2 write
boundaries, secret handling, and requirement traceability. The harness paths
in the prescribed structure are implementation/evaluation interfaces, not
permission for the coding agent to modify protected files.

## Project Structure

### Documentation (this feature)

```text
specs/001-meeting-action-extractor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── function-contract.md
    ├── response.schema.json
    ├── requirements-map.md
    ├── threshold-contract.md
    └── evaluator-contract.md
```

### Source Code and Protected Evaluation Artifacts (repository root)

```text
src/meeting_extractor/
├── agent.js
└── errors.js
prompts/
└── system_prompt.md
evals/
└── dataset.json
.harness/
├── run_eval.mjs
├── response.schema.json
├── requirements.json
├── threshold.json
├── input-lock.json
├── fixtures/
│   └── ideal-output.json
└── evaluators/
    ├── common.mjs
    ├── structural.mjs
    ├── invariants.mjs
    ├── matching.mjs
    ├── semantic.mjs
    └── aggregate.mjs
tests/
└── harness.selfcheck.test.js
package.json
package-lock.json
evidence/
├── results/ # hash-chained harness run records and snapshots
└── feedback/ # hash-chained structured failure feedback
```

### Requirement and Prompt Traceability

| File or prompt section | Requirement IDs served |
|---|---|
| `specs/001-meeting-action-extractor/spec.md` | FR-001–FR-029; SC-001–SC-013 |
| `specs/001-meeting-action-extractor/plan.md` | FR-019–FR-022; design and ownership traceability |
| `specs/001-meeting-action-extractor/research.md` | FR-013–FR-020, FR-022, FR-027; runtime, evaluator ownership, and provider rationale |
| `specs/001-meeting-action-extractor/data-model.md` | FR-001–FR-018, FR-023–FR-029; SC-001–SC-013 |
| `specs/001-meeting-action-extractor/quickstart.md` | FR-013–FR-018; SC-001–SC-007 |
| `contracts/function-contract.md` | FR-001–FR-012, FR-006a, FR-019–FR-020, FR-023–FR-029 |
| `contracts/response.schema.json` | FR-002–FR-006a, FR-009, FR-026, FR-029 |
| `contracts/requirements-map.md` | FR-001–FR-029; per-file and per-prompt traceability |
| `contracts/threshold-contract.md` | FR-013–FR-016; SC-001–SC-002, SC-006 |
| `contracts/evaluator-contract.md` | FR-013–FR-018; SC-001–SC-007; HR-1–HR-9, HR-11 |
| `checklists/requirements.md` | FR-021; specification readiness review only |
| `src/meeting_extractor/agent.js` | FR-001–FR-012, FR-019–FR-020, FR-023–FR-029 |
| `src/meeting_extractor/errors.js` | FR-014, FR-018, FR-027 |
| Prompt: role, task, and exact JSON output | FR-002–FR-006, FR-006a |
| Prompt: transcript boundary and untrusted-data rule | FR-010 |
| Prompt: action vs. hypothetical, rejected offer, and brainstorming | FR-003, FR-008, FR-011 |
| Prompt: decision qualification and revisions | FR-004, FR-008, FR-011 |
| Prompt: missing/ambiguous ownership and deadlines | FR-006–FR-008, FR-006a, FR-023–FR-024, FR-028–FR-029 |
| Prompt: meeting-date and relative-deadline rules | FR-001, FR-024, FR-028 |
| Prompt: quote grounding, length, contiguity, and redaction | FR-009–FR-010 |
| Prompt: multilingual output | FR-025 |
| Prompt: 25-item outcome limits and overflow; retain all questions | FR-026 |
| `evals/dataset.json` | FR-013; SC-002–SC-012; all per-case requirement IDs |
| `.harness/response.schema.json` | FR-002–FR-006a, FR-009, FR-026, FR-029 |
| `.harness/requirements.json` | FR-001–FR-029, including FR-006a |
| `.harness/threshold.json` | FR-015–FR-016; SC-002 |
| `.harness/evaluators/structural.mjs` | FR-002–FR-006a, FR-026, FR-029; SC-001, SC-011, SC-013 |
| `.harness/evaluators/invariants.mjs` | FR-006a–FR-012, FR-023–FR-029; SC-003–SC-005, SC-008–SC-013 |
| `.harness/evaluators/matching.mjs` | FR-015; semantic-unit matching definitions |
| `.harness/evaluators/semantic.mjs` | FR-015; SC-002, SC-004–SC-005, SC-008–SC-010, SC-012 |
| `.harness/evaluators/aggregate.mjs` | FR-014–FR-016; SC-001–SC-002 |
| `.harness/evaluators/common.mjs` | FR-014, FR-017–FR-018; shared evaluator-only helpers, no application-helper imports |
| `.harness/run_eval.mjs` | FR-013–FR-018; SC-001–SC-007; HR-1–HR-9 |
| `tests/harness.selfcheck.test.js` | FR-014–FR-018; HR-11 and protected evaluator self-check behavior |
| `package.json` and lock file | FR-019–FR-020, FR-022; Node version, ES module mode, Ajv, and `node:test` setup |
| Harness-generated `evidence/` | FR-017–FR-018; SC-007; first-generation preservation and reports |

**Structure Decision**: Use the user's exact single-project layout. Application
code is limited to the public `handle` function and its `ModelServiceError`
class, with one version-controlled prompt. Evaluation and acceptance logic
reside in the independent, externally owned harness. Paths under `evals/`,
`.harness/`, `tests/`, `evidence/`, and root dependency manifests are protected
from Phase 2 coding-agent edits by the constitution.

## Complexity Tracking

No constitution violations are accepted. The fixed 22-case external evaluator
and separation of evaluator ownership are required acceptance controls, not
additional application projects or permission to modify protected paths.
