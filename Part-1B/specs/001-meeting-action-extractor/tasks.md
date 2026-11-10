---

description: "Two-phase harness-first task list for the Meeting Action Extractor"
---

# Tasks: Meeting Action Extractor

**Input**: Approved design documents from `specs/001-meeting-action-extractor/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/`

**Approval gate**: Do not start Phase 1 until `spec.md`, `plan.md`, and `tasks.md` are approved. Phase 1 is owned by the independent evaluator owner. The application coding agent must not author or modify evaluator-owned artifacts.

**Traceability**: Task IDs below use the aliases defined in `contracts/requirements-map.md`, mapped to canonical FR/SC IDs. Dataset cases and `.harness/requirements.json` continue to use only canonical IDs from `spec.md`.

**Task format**: Every task uses `- [ ] Tnnn [P?] [USn?] description` with an exact file path and a `Trace:` list. `[P]` appears only where tasks modify independent files and have no unfinished dependency. Story labels are used only for application work belonging to a user story.

## PHASE 1 - Harness and Dataset (No Application Code)

**Owner**: Independent evaluator owner.

**Purpose**: Build, test, replay, and lock the complete external acceptance system before application implementation starts. No Phase 1 task creates or edits application code in `src/` or `prompts/`.

- [ ] T001 Obtain approval of `specs/001-meeting-action-extractor/spec.md`, `specs/001-meeting-action-extractor/plan.md`, and `specs/001-meeting-action-extractor/tasks.md` before beginning Phase 1. Trace: FR-021, FR-022.
- [ ] T002 [P] Create root `package.json` and `package-lock.json` with `"type": "module"`, Node.js `>=20`, Ajv's dedicated 2020-12 implementation, and the evaluator self-check script; keep all credentials out of both files. Trace: FR-019, FR-020, HR-11.
- [ ] T003 [P] Create `.harness/response.schema.json` as the exact SCH-1 copy of `contracts/response.schema.json`, and create `.harness/requirements.json` with `{ "id", "text" }` entries for every FR requirement in `spec.md`, including FR-006a; do not alter the canonical contracts. Trace: SCH-1, INV-1, FR-002–FR-006a, FR-009, FR-026, FR-029.
- [ ] T004 [P] Create `.harness/threshold.json` with exactly the EVAL-1 case count, category minimums, four 0.25 semantic weights, 90.0% threshold, aggregate formula, and hard gates from `contracts/threshold-contract.md`. Trace: EVAL-1, FR-013–FR-016, SC-001, SC-002, SC-006.
- [ ] T005 [P] Implement shared evaluator-only utilities in `.harness/evaluators/common.mjs` for canonical serialization, requirement lookup, record hashing, and common result/error handling; do not import application helpers. Trace: HR-1–HR-9, HR-11, INV-1, INV-2, GR-1.
- [ ] T006 [P] Implement independent Ajv 2020-12 response/schema checks in `.harness/evaluators/structural.mjs`, including exact keys, types, lengths, and item limits. Trace: SCH-1, INV-1, FR-002–FR-006a, FR-026, FR-029, SC-001, SC-011, SC-013.
- [ ] T007 [P] Implement property and invariant checks in `.harness/evaluators/invariants.mjs` for quote grounding/redaction, participant membership, clarification indexes and flags, deadline/date rules, limits, and privacy guardrails. Trace: INV-1, INV-2, BP-1, GR-1, FR-006a–FR-011, FR-023–FR-029, SC-003–SC-005, SC-008–SC-013.
- [ ] T008 [P] Implement semantic-unit matching in `.harness/evaluators/matching.mjs` so equivalent wording can match without exact-string-only comparison, while action matching includes task, assignee, and deadline. Trace: BP-1, EVAL-1, FR-015, SC-002, SC-004–SC-005, SC-008, SC-010, SC-012.
- [ ] T009 Implement four-category F1 scoring in `.harness/evaluators/semantic.mjs` using the categories and empty-set rules from EVAL-1; include action, decision, summary-fact, and clarification units. Trace: BP-1, EVAL-1, FR-015, SC-002, SC-004–SC-005, SC-008, SC-010, SC-012.
- [ ] T010 Implement the unweighted successful-case aggregate, one-decimal percentage rounding, hard-gate combination, and EVAL-1 threshold comparison in `.harness/evaluators/aggregate.mjs`. Trace: EVAL-1, FR-014–FR-016, SC-001, SC-002, SC-006.
- [ ] T011 Create `evals/dataset.json` with exactly 22 meaningful immutable cases, at least two distinct cases from each required category (normal, boundary, ambiguous, missing-information, malformed, adversarial), ground truth for each case, and canonical FR requirement IDs; cover all specified date, ambiguity, revision, ownership, decision, language, quote, list-limit, privacy/injection, and controlled `ModelServiceError` behaviors. Trace: BP-1, GR-1, EVAL-1, FR-007–FR-018, FR-023–FR-029, SC-002–SC-006, SC-008–SC-013.
- [ ] T012 Create `.harness/fixtures/ideal-output.json` containing schema-valid per-case model-output fixtures keyed to the replay case IDs; keep expected outputs in this evaluator-owned fixture, never in application code. Trace: SCH-1, BP-1, EVAL-1, HR-1–HR-9, HR-11.
- [ ] T013 Implement `.harness/run_eval.mjs` with the single ordered evaluation pipeline and CLI flags `--outputs FILE`, `--replay FILE`, `--repeats N`, `--lock`, and `--snapshot NAME`; support ideal-output replay without provider requests, fail closed on locked-input hash mismatch, preserve first-generation outputs, append hash-chained result records under `evidence/results/`, and emit hash-chained structured feedback under `evidence/feedback/` with case, output, violated requirement, and expected-versus-observed fields. The harness must import only `handle` and `ModelServiceError` from application code. Trace: EVAL-1, INV-1, INV-2, BP-1, GR-1, HR-1–HR-9, FR-013–FR-018, SC-001–SC-007.
- [ ] T014 Create protected self-checks in `tests/harness.selfcheck.test.js` covering HR-11, CLI argument validation, each pipeline stage, schema and invariant failures, semantic scoring/aggregation, replay, repeat behavior, locked-input hash verification, snapshots, hash-chain integrity, and structured feedback; never skip or weaken a self-check. Trace: SCH-1, INV-1, INV-2, BP-1, GR-1, EVAL-1, HR-11, FR-014–FR-018, SC-001–SC-007.
- [ ] T015 Run `node --test tests/harness.selfcheck.test.js` and `node .harness/run_eval.mjs --replay .harness/fixtures/ideal-output.json --repeats 1 --snapshot phase1-ideal`; verify the entire pipeline and all expected fixture outputs, schema checks, invariants, feedback handling, and hash-chain verification pass before locking. Trace: SCH-1, INV-1, INV-2, BP-1, GR-1, EVAL-1, HR-1–HR-9, HR-11, FR-014–FR-018, SC-001–SC-007.
- [ ] T016 After T015 passes, create `.harness/input-lock.json` with SHA-256 hashes for the dataset, schema, requirements, threshold, evaluator modules, runner, fixtures, and self-check tests; run `.harness/run_eval.mjs --lock` to verify the recorded hashes, then record the lock and Phase 1 completion for review. Trace: EVAL-1, HR-1–HR-9, HR-11, FR-013–FR-018, SC-001–SC-007.

### ⛔ STOP POINT

**Phase 1 complete - lock before Phase 2**

Do not begin Phase 2 until the independent evaluator owner confirms that T015 passed, T016 produced and verified the immutable lock, and the Phase 1 artifacts are approved. If any gate fails, remain in Phase 1; do not begin application implementation.

---

## PHASE 2 - Application Only

**Owner**: Application coding agent, after the Phase 1 stop gate is approved.

**Permitted writes**: Only `src/` and `prompts/`. No task in this phase may create or edit `tests/`, `evals/`, any path under `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, or a lock file. The locked Phase 1 evaluator artifacts are read-only.

**User Story 1 - Extract meeting outcomes (P1)**

**Goal**: Return one SCH-1 response with supported tasks, decisions, source quotes, and summary.

**Independent test**: Replay an explicit commitment and decision through the locked evaluator; verify the response shape, source evidence, supported fields, summary, and no invented outcomes.

- [ ] T017 Implement and export `ModelServiceError` in `src/meeting_extractor/errors.js` for provider, network, rate-limit, timeout, refusal, incomplete-response, and unusable-model-output failures; preserve the error name and cause without logging credentials or transcript content. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T017 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: FR-014, FR-018, FR-022, FR-027, EVAL-1, HR-1–HR-9.
- [ ] T018 [US1] Create the versioned system prompt in `prompts/system_prompt.md` with the extraction role, exact SCH-1 JSON shape, transcript-as-data delimiters, source-grounded outcome criteria, and summary instructions. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T018 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: SCH-1, BP-1, FR-002–FR-006, FR-010–FR-011, FR-022, FR-025.
- [ ] T019 [US1] Implement `handle(transcript, context = null)` in `src/meeting_extractor/agent.js` with caller-input validation, environment-only provider configuration, one low-temperature OpenAI Responses API request with a 30-second timeout and no retry, robust JSON parsing, SCH-1 validation, and the specified empty-input response; propagate `ModelServiceError` and never return a success-shaped fallback. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T019 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: SCH-1, INV-1, BP-1, EVAL-1, FR-001–FR-006, FR-012, FR-019–FR-020, FR-022, FR-027.

**User Story 2 - Resolve ambiguity without guessing (P1)**

**Goal**: Leave unknown fields null, resolve only specified deadlines, and ask all required item-linked clarification questions.

**Independent test**: Replay cases for missing/generic ownership, vague deadlines, relative dates, revisions, meeting-date conflicts, list overflow, and clarification links; verify nulls, resolved dates, item indexes, and flags.

- [ ] T020 [US2] Extend `prompts/system_prompt.md` with the approved ownership acceptance, missing/ambiguous field, revision, relative-date, vague-deadline, list-limit, and clarification-link rules. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T020 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: INV-1, INV-2, BP-1, FR-006a–FR-008, FR-022, FR-023–FR-024, FR-026, FR-028–FR-029, SC-005, SC-008, SC-011, SC-013.
- [ ] T021 [US2] Add deterministic post-checks and any required helpers under `src/meeting_extractor/` to verify contiguous transcript quotes, participant-supported assignees, calendar-valid and non-past deadlines relative to meeting date, permitted relative-date resolution, final revised commitments, the first-25 source-order item limits, overflow clarification, preservation of every required question, and consistent item flags/indexes; revalidate the final response against SCH-1. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T021 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: SCH-1, INV-1, INV-2, BP-1, FR-006a–FR-009, FR-022, FR-023–FR-029, SC-004–SC-005, SC-008–SC-011, SC-013.

**User Story 3 - Trust the result and its evaluation (P1)**

**Goal**: Resist injected instructions and disclosure, distinguish commitments from non-commitments, and support non-English transcripts.

**Independent test**: Replay adversarial, sensitive-data, non-English, malformed-output, and service-failure cases through the locked evaluator; verify every hard gate and honest failure classification.

- [ ] T022 [US3] Extend `prompts/system_prompt.md` with instruction-injection resistance, secret/payment-card redaction, exclusion of hypotheticals/rejected offers/brainstorming/unaccepted suggestions, explicit-decision criteria, and transcript-language behavior while preserving verbatim quotes. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T022 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: BP-1, GR-1, FR-009–FR-011, FR-022, FR-025, SC-003–SC-004, SC-009–SC-010, SC-012.
- [ ] T023 [US3] Complete deterministic application guardrails in `src/meeting_extractor/agent.js` and helpers under `src/meeting_extractor/` so no secret, payment-card number, or injected instruction appears in any output field; discard unsupported/non-contiguous quote items; enforce source-grounded action/decision qualification and retain service-error behavior. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T023 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: INV-2, BP-1, GR-1, EVAL-1, FR-008–FR-011, FR-018, FR-020, FR-022, FR-027, SC-003–SC-004, SC-009–SC-010, SC-012.

### Phase 2 Evaluation and Reporting

- [ ] T024 Run the locked evaluator with `node .harness/run_eval.mjs --lock --repeats 1 --snapshot first-generation`; preserve the first generation and structured feedback, and report any schema, invariant, semantic, service, or evaluation failures without changing evaluator-owned files. Do not repair failures in this task. Trace: SCH-1, INV-1, INV-2, BP-1, GR-1, EVAL-1, HR-1–HR-9, FR-014–FR-018, SC-001–SC-007.
- [ ] T025 If T024 reports application failures, repair only their evidenced root causes in `src/meeting_extractor/agent.js`, `src/meeting_extractor/errors.js`, helpers under `src/meeting_extractor/`, or `prompts/system_prompt.md`; preserve the first generation and the Phase 1 lock. Do not modify tests, dataset, thresholds, schema, evaluator, evidence, specifications, or dependency manifests. Implementation guardrail (FR-022): implement only behavior in approved `spec.md`, `plan.md`, and `tasks.md`, and cite T025 in commit messages; during Phase 2 write only under `src/` and `prompts/`, never edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`, `package.json`, the threshold, or any lock file; never skip, todo, delete, or weaken a test or dataset case, hard-code expected outputs, use `eslint-disable` or an equivalent bypass, or expose secrets; if a requirement appears wrong, stop and report it instead of changing it in code. Trace: SCH-1, INV-1, INV-2, BP-1, GR-1, EVAL-1, HR-1–HR-9, HR-11, FR-017–FR-018, FR-022, SC-001–SC-007.
- [ ] T026 Final task: run `node .harness/run_eval.mjs --lock --repeats 3 --snapshot final --outputs evidence/final-report.json` and report PASS/FAIL, aggregate score versus the unchanged 90.0% threshold, hard-gate results, service failures, failed requirements, and known limitations; do not fix failures inside this task or alter protected artifacts. A human must record ACCEPT or REJECT after any automated PASS. Trace: SCH-1, INV-1, INV-2, BP-1, GR-1, EVAL-1, HR-1–HR-9, HR-11, FR-014–FR-018, SC-001–SC-007.

## Dependencies and Execution Order

```text
Phase 1:
T001 -> (T002, T003, T004, T005)
T003 + T005 -> (T006, T007, T008)
T008 -> T009 -> T010
T003 + T004 -> T011 -> T012
(T006-T012) -> T013 -> T014 -> T015 -> T016
STOP: Phase 1 complete - lock before Phase 2

Phase 2:
T016 approval -> T017 -> T018 -> T019 -> T020 -> T021 -> T022 -> T023
-> T024 -> [T025 only if repair is needed] -> T026
```

**Parallel opportunities**: In Phase 1, T002, T003, T004, and T005 operate on independent files and may start together after T001. T006, T007, and T008 may proceed in parallel after T003/T005; later evaluator tasks follow their explicit dependencies. Phase 2 application tasks are sequential because prompt and handler behavior share requirements and must be integrated in order.

## Implementation Strategy

1. Complete and approve all Phase 1 evaluator artifacts, dataset, self-checks, and ideal-output replay; create and verify the input lock.
2. Stop at the mandatory boundary. Do not start application work before Phase 1 lock approval.
3. Implement Phase 2 stories in order: US1 extraction, US2 ambiguity resolution, US3 safety and trust.
4. Run the first locked evaluation before any repair; repair only application-side causes in T025.
5. Run T026 as the final task. Report results without making repairs within that task.
6. Human ACCEPT/REJECT is required after automated PASS; PASS alone is not acceptance.
