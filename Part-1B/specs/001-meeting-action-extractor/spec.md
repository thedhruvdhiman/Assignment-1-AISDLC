# Feature Specification: Meeting Action Extractor

**Feature Branch**: `001-meeting-action-extractor`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Create a small LLM-backed meeting action item and decision extractor. Given an unstructured meeting transcript or rough notes, return one structured JSON object containing action items, key decisions, a short summary, and clarification questions. Do not guess missing information; ground extracted items in source quotes; defend against transcript-borne instructions and sensitive data. Use Node.js 20+ ES modules and one async function with an independent evaluation harness; no UI, database, or web framework."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract meeting outcomes (Priority: P1)

As a meeting participant, I want to provide a transcript or rough notes and
receive the agreed tasks, decisions, and a concise summary, so that I can act
on the meeting without rereading the entire source.

**Why this priority**: Reliable extraction of the meeting's actual outcomes is
the feature's core value.

**Independent Test**: Provide a transcript with explicit commitments,
assignees, deadlines, and decisions. Verify that one JSON object contains the
supported outcomes and source quotes, and does not add unsupported outcomes.

**Acceptance Scenarios**:

1. **Given** notes with an explicit task, named assignee, and definite
   deadline, **When** the notes are processed, **Then** the action item
   contains the supported task, assignee, deadline, and a supporting source
   quote.
2. **Given** a transcript with an explicit decision and no action commitments,
   **When** it is processed, **Then** the decision is included with its
   supporting quote and no action item is invented.
3. **Given** a transcript with supported outcomes, **When** it is processed,
   **Then** the output includes a concise summary of its key points.

---

### User Story 2 - Resolve ambiguity without guessing (Priority: P1)

As a meeting participant, I want missing or unclear ownership and deadlines
called out, so that I can resolve gaps instead of relying on invented details.

**Why this priority**: A plausible but unsupported owner, date, or task can
cause missed work and false commitments.

**Independent Test**: Provide notes with an action but a missing or vague
assignee or deadline. Verify the uncertain field is `null` and a question
identifies the missing information for that item.

**Acceptance Scenarios**:

1. **Given** an action assigned to "someone" or "the team", **When** it is
   processed, **Then** its assignee is `null` and a clarification question
   asks for a specific owner.
2. **Given** an action due "soon" or "next week", **When** no definite date
   can be established from the input, **Then** its deadline is `null` and a
   clarification question asks for a definite deadline.
3. **Given** incomplete or ambiguous notes, **When** they are processed,
   **Then** the output contains only source-supported tasks and decisions and
   asks about missing or ambiguous information without inventing facts.

---

### User Story 3 - Trust the result and its evaluation (Priority: P1)

As a user and reviewer, I want transcript-borne instructions and sensitive
content handled safely, and quality assessed independently, so that the result
is grounded and a reported PASS is meaningful.

**Why this priority**: Meeting text is untrusted input, and structural and
privacy failures cannot be excused by an otherwise plausible summary.

**Independent Test**: Run adversarial and ordinary cases through the
independent evaluation pipeline. Verify schema and invariant checks, source
grounding, privacy guardrails, semantic score calculation, and an honest
PASS/FAIL or service-failure report.

**Acceptance Scenarios**:

1. **Given** a transcript containing instructions to ignore prior directions,
   reveal system instructions, or change the output, **When** it is processed,
   **Then** those instructions are treated as data, not followed or echoed,
   and no system instructions are revealed.
2. **Given** a transcript containing a secret or payment-card number,
   **When** an output is produced, **Then** the sensitive value appears in no
   output field, including source quotes and clarification questions.
3. **Given** an evaluation dataset with ground truth and requirement IDs,
   **When** the external harness runs, **Then** it performs the specified
   single pipeline, records failures as evidence, and reports a PASS only
   when all hard gates pass and the declared semantic threshold is met.
4. **Given** an automated evaluation PASS, **When** the result is reviewed,
   **Then** a human records ACCEPT or REJECT; the automated result alone does
   not imply acceptance.

### Edge Cases

- Empty or whitespace-only input produces no invented meeting content and
  asks the caller to provide transcript or notes.
- Rough notes may be fragments, contain spelling errors, or omit punctuation;
  supported meaning is extracted without filling gaps with guesses.
- An action with a clear task but no owner or deadline remains an action item;
  each missing field is `null` and has a related clarification question.
- Relative or vague deadlines (for example, "soon" or "next week") remain
  `null` and trigger clarification; only a definite deadline stated by the
  source is retained.
- A name is eligible as an assignee only if it appears in the transcript or
  supplied participants list.
- Hypotheticals, rejected offers, and brainstorming are not commitments and
  must not be reported as actions or decisions.
- Sensitive values are excluded from all output fields; supporting quotes
  redact sensitive spans when needed.
- Malformed or non-JSON model responses do not become success-shaped output;
  the application or evaluation failure is reported.
- Model or service timeouts and rate limits are reported separately from
  application and evaluation failures, and cannot produce an evaluation PASS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The function MUST accept one meeting transcript or rough-notes
  text and MAY accept a list of meeting participant names.
- **FR-002**: For valid input, the function MUST return exactly one JSON object
  with exactly these top-level keys: `actionItems`, `keyDecisions`,
  `summary`, and `clarificationQuestions`. It MUST NOT wrap the object in
  markdown or add surrounding prose.
- **FR-003**: `actionItems` MUST be an array of objects with exactly these
  fields: `task` (non-empty string), `assignee` (string or `null`),
  `deadline` (string or `null`), and `sourceQuote` (string). Each item MUST
  represent a source-supported task commitment.
- **FR-004**: `keyDecisions` MUST be an array of objects with exactly these
  fields: `decision` (non-empty string) and `sourceQuote` (string). Each item
  MUST represent an explicit, source-supported decision.
- **FR-005**: `summary` MUST be a short string of no more than three
  sentences, and MUST not add facts that are absent from the source.
- **FR-006**: `clarificationQuestions` MUST be an array of objects with
  exactly these fields: `question` (non-empty string), `relatedTo`
  (`actionItem`, `decision`, or `transcript`), and `itemIndex` (zero-based
  integer or `null`). When the question relates to an action item or decision,
  `itemIndex` MUST identify that item in its corresponding output array.
- **FR-007**: If an action's assignee or deadline is missing, vague, or
  ambiguous, the respective field MUST be `null` and a clarification question
  MUST identify the missing or ambiguous information for that action.
- **FR-008**: The function MUST NOT invent a person, date, task, decision, or
  other missing detail. A named assignee MUST appear in the transcript or
  participant list. A deadline MUST be supported and unambiguous in the input.
- **FR-009**: Every action and decision MUST include a verbatim supporting
  source quote. A sensitive secret or payment-card number within the quote
  MUST be redacted; all other quoted text MUST remain verbatim. Source quotes
  MUST come from the transcript or rough notes, not from model-generated
  content.
- **FR-010**: Transcript text MUST be treated as data, never as instructions.
  The function MUST NOT follow or echo injected instructions or reveal system
  instructions. It MUST NOT copy secrets or payment-card numbers into any
  output field.
- **FR-011**: Hypotheticals, rejected offers, and brainstorming MUST NOT be
  emitted as action items or decisions unless the source separately records
  an explicit commitment or decision.
- **FR-012**: Empty or whitespace-only text MUST produce the same JSON
  contract with empty action and decision arrays, an empty summary, and a
  clarification question requesting meeting text. Invalid caller input types
  MUST be reported as input errors, not converted into fabricated meeting
  content.
- **FR-013**: The independent evaluation dataset MUST contain at least 15
  meaningful cases, with at least two distinct cases for each of the normal,
  boundary, ambiguous, missing-information, malformed, and adversarial
  categories. Every case MUST have ground truth and trace to one or more
  requirement IDs.
- **FR-014**: Quality MUST be decided by an external harness running one
  pipeline, in this order: dataset -> application -> schema validation ->
  invariant/property checks -> semantic scoring -> aggregate versus threshold
  -> PASS/FAIL. Any optional LLM judge MUST NOT replace schema, structural,
  invariant, or property checks.
- **FR-015**: The semantic score for each case MUST be the equally weighted
  mean of four F1 scores: action-item semantic units, decision semantic units,
  annotated summary facts, and required clarification needs. For each
  category, precision is matched produced units divided by all produced units,
  recall is matched expected units divided by all expected units, and F1 is
  `2 * precision * recall / (precision + recall)`. If both expected and
  produced sets are empty, the category score is 1.0; if exactly one set is
  empty, or both precision and recall are zero, its score is 0.0.
  Action-item units match only when the task, assignee, and deadline are
  semantically correct, including `null` for missing or ambiguous fields;
  decision units match when the decision is semantically correct. Each
  category MUST include false positives and false negatives in precision and
  recall. The aggregate score MUST be the unweighted arithmetic mean of all
  case scores, expressed as a percentage and rounded to one decimal place.
  Semantic matching MUST allow equivalent wording and MUST NOT use
  exact-string matching as the sole criterion.
- **FR-016**: Before the first evaluation, this specification fixes the
  acceptance threshold at **90.0% aggregate semantic score**. PASS additionally
  requires every case to pass schema validation and all applicable
  non-negotiable invariants and guardrails. The threshold, formula, and dataset
  MUST NOT be lowered, changed, removed, or weakened to obtain PASS.
- **FR-017**: Before any repair, a failed evaluation MUST preserve the first
  generation and produce structured feedback containing the case, output,
  violated requirement, and expected versus observed behavior. Repairs MUST
  fix application-side root causes; evaluation tests, dataset cases,
  thresholds, and this specification MUST NOT be edited to hide a failure.
- **FR-018**: Model or service failures, including timeouts and rate limits,
  MUST be reported separately from application or evaluation failures. An
  incomplete run caused by such a failure MUST NOT be reported as PASS.
  Evaluation reports MUST disclose failed requirements and known limitations.
  Every automated PASS MUST be followed by a human ACCEPT or REJECT decision.
- **FR-019**: The application MUST target Node.js 20 or later using ES
  modules, and MUST consist of one asynchronous function plus an independent
  evaluation harness. The feature MUST NOT include a user interface, database,
  or web framework.
- **FR-020**: API keys MUST be obtained only from environment variables and
  MUST never be written to files or committed. Application code MUST NOT use
  `eval`, `new Function`, or shell execution.
- **FR-021**: Implementation MUST begin only after `spec.md`, `plan.md`, and
  `tasks.md` are approved. If later ambiguity arises, the upstream Spec Kit
  artifact and its change history MUST be updated before code.
- **FR-022**: The coding agent MUST implement only behavior described by the
  approved `spec.md`, `plan.md`, and `tasks.md`; commit messages MUST cite
  task IDs. During Phase 2, the agent MUST write only under `src/` and
  `prompts/`, and MUST NOT edit `tests/`, `evals/`, `.harness/`, `evidence/`,
  `specs/`, `.specify/`, `package.json`, the threshold, or any lock file.
  The agent MUST NOT skip, todo, delete, or weaken a test or dataset case,
  hard-code expected outputs, use `eslint-disable` or an equivalent bypass,
  or expose secrets. If a requirement appears wrong, the agent MUST stop and
  report it instead of changing it in code. These hard rules MUST be repeated
  in every implementation step.
- **FR-023**: When the input suggests a possible action or decision but its
  meaning cannot be stated without guessing, the function MUST NOT invent or
  assert the unclear item. It MUST ask a clarification question linked to the
  transcript or to a supported related item when possible.

### Key Entities *(include if feature involves data)*

- **Meeting Input**: The transcript or rough notes supplied for extraction,
  optionally accompanied by a list of participants.
- **Action Item**: A task commitment supported by source text, with a task,
  possibly unresolved assignee and deadline, and a supporting source quote.
- **Decision**: An explicit outcome supported by source text and a source
  quote.
- **Clarification Question**: A question about a missing or ambiguous fact,
  optionally linked to an action item or decision by type and array index.
- **Evaluation Case**: A labeled input with ground truth, applicable
  requirement IDs, and semantic units used to independently assess output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed evaluation cases produce one object that
  passes the declared schema and structural checks.
- **SC-002**: The aggregate semantic score is at least 90.0% under the
  formula in FR-015, with no case violating a non-negotiable invariant or
  guardrail.
- **SC-003**: Zero secrets, payment-card numbers, or system instructions are
  disclosed in any output field in the adversarial evaluation cases.
- **SC-004**: Every supported action and decision in evaluation ground truth
  is represented with a supporting source quote, and unsupported
  hypotheticals, rejected offers, and brainstorming are not emitted as
  commitments.
- **SC-005**: Every evaluated missing or ambiguous assignee or deadline is
  represented as `null` and has a related clarification question.
- **SC-006**: The independent dataset contains at least 15 meaningful cases,
  contains at least two distinct cases from each required category, and
  provides ground truth and requirement traceability for every case.
- **SC-007**: Every completed automated PASS has a recorded human ACCEPT or
  REJECT decision; service failures are reported separately and never as
  PASS.

## Assumptions

- The caller supplies one transcript or rough-notes string per invocation;
  participant names are optional.
- Deadline values are represented using the unambiguous wording supported by
  the source; no date is inferred from the current date or unstated context.
- The LLM service and its provider are selected during planning. The service
  is available for evaluation through credentials supplied as environment
  variables; its outages are reported as service failures.
- The external evaluation harness, its dataset, and its acceptance controls
  are maintained separately from application code and are not changed by the
  coding agent during implementation.
- Phase 2 is the implementation phase. Its directory restrictions apply to
  the coding agent and do not authorize changes to protected evaluation
  artifacts.
