# Feature Specification: Meeting Action Extractor

**Feature Branch**: `001-meeting-action-extractor`

**Created**: 2026-11-10

**Status**: Approved

**Input**: User description: "Create a small LLM-backed meeting action item and decision extractor. Given an unstructured meeting transcript or rough notes, return one structured JSON object containing action items, key decisions, a short summary, and clarification questions. Do not guess missing information; ground extracted items in source quotes; defend against transcript-borne instructions and sensitive data. Use Node.js 20+ ES modules and one async function with an independent evaluation harness; no UI, database, or web framework."

## Clarifications

### Session 2026-11-10

- Q: How is the reference meeting date determined for relative deadlines?
  → A: Use a caller-supplied date or an unambiguous date stated in the transcript;
  if neither is available, leave the deadline null and ask for clarification.
- Q: Does the 25-item limit include clarification questions?
  → A: Earlier decision superseded by the clarification dated 2026-11-11:
  clarification questions are not capped; keep all required questions.
- Q: How are relative deadlines resolved?
  → A: "End of the month" is the last calendar day of the meeting's month;
  "tomorrow" is meeting date plus one day; "in N days" is meeting date plus N
  days; a bare weekday is its next occurrence strictly after the meeting date.
- Q: Which deadline phrases are too vague to resolve?
  → A: "Next week", "soon", "later", "ASAP", and "before <event>" leave the
  deadline null and require clarification.
- Q: How are revised commitments represented?
  → A: Report only the final version of a revised commitment.
- Q: How is ownership determined when acceptance is unclear?
  → A: If nobody accepts a task, set its assignee to null and ask for
  clarification; if someone declines and another person accepts, assign it to
  the person who accepted.
- Q: What qualifies as a decision?
  → A: Require explicit agreement or a statement such as "we decided" or "we
  agreed"; suggestions alone are not decisions.
- Q: How are non-English transcripts handled?
  → A: Support them; task and summary text may be in English or the
  transcript's language, while source quotes remain verbatim apart from
  required sensitive-span redaction.
- Q: What constraints apply to source quotes?
  → A: Each quote is one contiguous source span of 1–300 characters; redact
  sensitive values so no quote contains a secret.
- Q: What happens when output lists exceed their limit?
  → A: Keep the first 25 items in source order and add an overflow
  clarification with `about: "other"`; clarification questions reserve their
  25th slot for this notice when needed.
- Q: How are model or API failures handled?
  → A: Raise `ModelServiceError`; never return a fabricated or empty answer.

### Session 2026-11-11

- Q: What public function signature and context shape are required?
  → A: Export `async function handle(transcript, context = null)` from
  `src/meeting_extractor/agent.js`; context may provide `meetingDate` and
  `participants`.
- Q: How many evaluation cases are required?
  → A: Use exactly 22 fixed, meaningful cases with ground truth and
  requirement traceability; retain all cases and acceptance criteria.
- Q: How should a quote containing sensitive text be checked against its source?
  → A: It must match one contiguous transcript span after sensitive values are
  replaced with `[REDACTED]`; all remaining characters must be verbatim.
- Q: When is an otherwise supported deadline considered past?
  → A: A deadline before the resolved meeting date is invalid; set it to null
  and ask for clarification. Do not compare it with the machine's current date.
- Q: How is `needs_clarification` represented?
  → A: Add a boolean `needs_clarification` field to each action item and
  decision; it must agree with the presence of clarification questions linked
  to that item.
- Q: What identifier names the fixed evaluation acceptance contract?
  → A: Use EVAL-1 for the 22-case evaluation with four equally weighted
  semantic categories and a 90.0% aggregate threshold.
- Q: How should the clarification-question limit and item flags work when many
  items need clarification?
  → A: Do not cap clarification questions; keep all required item-linked and
  transcript-level questions so each item's `needs_clarification` flag remains
  consistent with its linked question.

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
4. **Given** a transcript with a task commitment that is later revised,
   **When** it is processed, **Then** only the final version is returned.

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
4. **Given** an unambiguous meeting date and a relative deadline such as
   "tomorrow" or a bare weekday, **When** it is processed, **Then** the
   deadline is resolved using the specified calendar rules.

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
  `null` and trigger clarification; relative deadlines resolve only against
  an explicitly supplied or unambiguously stated meeting date.
- A revised commitment is represented by its final version only.
- An unaccepted task has a null assignee and a clarification; a declined
  offer is assigned to the person who accepts it.
- Suggestions alone are not decisions; explicit agreement or a statement
  that a decision was made is required.
- Non-English transcripts are supported; task and summary text may be English
  or in the transcript's language, and source quotes remain verbatim.
- Each source quote is one contiguous span of 1–300 characters, with any
  sensitive span redacted.
- Action and decision lists are capped at 25 entries; outcome-list overflow
  is signaled by an `about: "other"` clarification. Keep all clarification
  questions without a count limit.
- A model or API failure raises `ModelServiceError`; no empty or fabricated
  success response is returned.
- If caller-supplied and transcript-stated meeting dates conflict, relative
  deadlines remain `null` and a clarification question identifies the conflict.
- A deadline earlier than the resolved meeting date is `null` and has a
  clarification question; deadlines are never compared with the current date.
- A name is eligible as an assignee only if it appears in the transcript or
  supplied participants list.
- Hypotheticals, rejected offers, and brainstorming are not commitments and
  must not be reported as actions or decisions.
- Sensitive values are excluded from all output fields; supporting quotes
  redact sensitive spans when needed.
- Malformed or non-JSON model responses do not become success-shaped output;
  they raise `ModelServiceError` and are reported separately from evaluation
  failures.
- Model or service timeouts and rate limits are reported separately from
  application and evaluation failures. An unexpected live outage prevents a
  PASS; a controlled error case passes only when `ModelServiceError` is raised.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The function MUST accept one meeting transcript or rough-notes
  text, and MAY accept a list of meeting participant names and a caller-supplied
  meeting date in `YYYY-MM-DD` form through a nullable context object with
  `participants` and `meetingDate` fields. When a caller-supplied date is
  absent, the function MUST use a meeting date stated unambiguously in the
  transcript when available.
- **FR-002**: For valid input, the function MUST return exactly one JSON object
  with exactly these top-level keys: `actionItems`, `keyDecisions`,
  `summary`, and `clarificationQuestions`. It MUST NOT wrap the object in
  markdown or add surrounding prose.
- **FR-003**: `actionItems` MUST be an array of objects with exactly these
  fields: `task` (non-empty string), `assignee` (string or `null`),
  `deadline` (string or `null`), `source_quote` (string of 1–300 characters),
  and `needs_clarification` (boolean). Each item MUST represent a
  source-supported task commitment.
- **FR-004**: `keyDecisions` MUST be an array of objects with exactly these
  fields: `decision` (non-empty string), `source_quote` (string of 1–300
  characters), and `needs_clarification` (boolean). Each item MUST represent
  an explicit, source-supported decision made by stated agreement or an
  explicit statement that a decision was made; a suggestion alone MUST NOT
  qualify.
- **FR-005**: `summary` MUST be a short string of no more than three
  sentences, and MUST not add facts that are absent from the source.
- **FR-006**: `clarificationQuestions` MUST be an array of objects with
  exactly these fields: `question` (non-empty string), `about`
  (`actionItem`, `decision`, `transcript`, or `other`), and `itemIndex`
  (zero-based integer or `null`). For `about: "actionItem"` or
  `about: "decision"`, `itemIndex` MUST identify that item in its corresponding
  output array; for other values it MUST be `null`.
- **FR-006a**: An action or decision item's `needs_clarification` MUST be
  `true` if and only if at least one clarification question points to that
  item using its `about` value and `itemIndex`. Questions about the transcript
  or overflow do not set an individual item's flag.
- **FR-007**: If an action's assignee or deadline is missing, vague, or
  ambiguous, the respective field MUST be `null` and a clarification question
  MUST identify the missing or ambiguous information for that action, and its
  `needs_clarification` MUST be `true`. If nobody accepts a task, its assignee
  MUST be `null`; when a person declines and another accepts, the accepting
  person MUST be assigned.
- **FR-008**: The function MUST NOT invent a person, date, task, decision, or
  other missing detail. A named assignee MUST appear in the transcript or
  participant list. A deadline MUST be supported and unambiguous in the input.
  A revised commitment MUST be represented by its final version only.
- **FR-009**: Every action and decision MUST include a `source_quote` derived
  from one contiguous span of the transcript or rough notes, with length from
  1 through 300 characters. The quote MUST NOT combine non-contiguous source
  text. A secret or payment-card number MUST be replaced with `[REDACTED]`;
  all other characters in the selected span MUST remain verbatim. A quote
  MUST match its corresponding contiguous source span after applying the same
  redactions. Source quotes MUST NOT be model-generated.
- **FR-010**: Transcript text MUST be treated as data, never as instructions.
  The function MUST NOT follow or echo injected instructions or reveal system
  instructions. It MUST NOT copy secrets or payment-card numbers into any
  output field.
- **FR-011**: Hypotheticals, rejected offers, and brainstorming MUST NOT be
  emitted as action items or decisions unless the source separately records
  an explicit commitment or decision. Suggestions alone MUST NOT be emitted
  as decisions.
- **FR-012**: Empty or whitespace-only text MUST produce the same JSON
  contract with empty action and decision arrays, an empty summary, and a
  clarification question requesting meeting text. Invalid caller input types
  MUST be reported as input errors, not converted into fabricated meeting
  content.
- **FR-013**: The independent evaluation dataset MUST contain exactly 22
  meaningful cases, with at least two distinct cases for each of the normal,
  boundary, ambiguous, missing-information, malformed, and adversarial
  categories. It MUST cover each clarification's date-resolution, ambiguity,
  revision, assignment, decision, language, quote, list-limit, and service
  failure behavior, including a controlled service-failure case whose expected
  result is `ModelServiceError`. Every case MUST have ground truth and trace to
  one or more requirement IDs.
- **FR-014**: Quality MUST be decided by an external harness running one
  pipeline, in this order: dataset -> application -> schema validation ->
  invariant/property checks -> semantic scoring -> aggregate versus threshold
  -> PASS/FAIL. Successful-extraction cases MUST undergo schema, invariant,
  and semantic checks. A controlled service-failure case MUST pass only when
  the expected `ModelServiceError` is raised; it is checked against that error
  contract rather than scored as an empty JSON extraction. An unexpected live
  service failure during a successful-extraction case MUST be reported as a
  service failure and prevent the incomplete run from passing. Any optional
  LLM judge MUST NOT replace schema, structural, invariant, or property checks.
- **FR-015**: The semantic score for each successful-extraction case MUST be
  the equally weighted mean of four F1 scores, with weight 0.25 each:
  action-item semantic units, decision semantic units, annotated summary facts,
  and required clarification needs. For each
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
  successful-extraction case scores, expressed as a percentage and rounded to
  one decimal place.
  Semantic matching MUST allow equivalent wording and MUST NOT use
  exact-string matching as the sole criterion.
- **FR-016**: Before the first evaluation, this specification fixes the
  EVAL-1 acceptance threshold at **90.0% aggregate semantic score**. PASS additionally
  requires every successful-extraction case to pass schema validation and all
  applicable non-negotiable invariants and guardrails, and each controlled
  service-failure case to raise its expected `ModelServiceError`. Unexpected
  service failures MUST NOT yield PASS. The threshold, formula, and dataset
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
- **FR-024**: A relative deadline MUST be resolved only when an explicit
  caller-supplied meeting date or an unambiguous date in the transcript is
  available. "End of the month" resolves to the last calendar day of that
  meeting month; "tomorrow" resolves to meeting date plus one day; "in N
  days" resolves to meeting date plus N days; and a bare weekday resolves to
  the next occurrence strictly after the meeting date. A resolved deadline
  MUST be returned as `YYYY-MM-DD`. "Next week", "soon", "later", "ASAP",
  and "before <event>" MUST produce a null deadline and a clarification
  question. If the meeting date is unavailable, an otherwise relative
  deadline MUST remain null and require clarification. If the supplied and
  transcript-stated meeting dates conflict, relative deadlines MUST remain
  null and the conflict MUST be raised as a clarification.
- **FR-025**: Non-English transcripts MUST be supported. Task and summary
  text MAY be in English or in the transcript's language. Source quotes MUST
  remain verbatim apart from required sensitive-span redaction.
- **FR-026**: Each of `actionItems` and `keyDecisions` MUST contain at most
  25 entries. Each list MUST retain its first 25 final commitments or
  decisions in source order. When either outcome list is truncated, the output
  MUST include a clarification with `about: "other"` and `itemIndex: null`.
  Clarification questions MUST NOT be capped or truncated; all required
  item-linked and transcript-level questions MUST be returned. A single
  overflow notice MAY cover multiple truncated outcome lists.
- **FR-027**: Model or API failures, including timeouts and rate limits,
  MUST raise an error named `ModelServiceError`. The function MUST NOT return
  a fabricated, empty, or otherwise success-shaped answer for such failures.
- **FR-028**: A deadline before the resolved meeting date MUST be set to
  `null` and MUST have a clarification question. Deadlines MUST NOT be
  compared with the machine's current date.
- **FR-029**: Each action item and decision MUST set
  `needs_clarification` consistently with FR-006a. This flag MUST NOT replace
  the required item-level clarification question.

### Key Entities *(include if feature involves data)*

- **Meeting Input**: The transcript or rough notes supplied for extraction,
  optionally accompanied by participant names and a meeting date.
- **Action Item**: A task commitment supported by source text, with a task,
  possibly unresolved assignee and deadline, a supporting source quote, and
  an item-level clarification flag.
- **Decision**: An explicit outcome supported by source text and a source
  quote, with an item-level clarification flag.
- **Clarification Question**: A question about a missing or ambiguous fact,
  identified by its `about` value and optionally linked to an action item or
  decision by array index.
- **Evaluation Case**: A labeled input with ground truth, applicable
  requirement IDs, and semantic units used to independently assess output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed successful-extraction cases produce one
  object that passes the declared schema and structural checks; model/service
  failures are reported separately and never as empty extractions.
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
- **SC-006**: The independent dataset contains exactly 22 meaningful cases,
  contains at least two distinct cases from each required category, and
  provides ground truth and requirement traceability for every case.
- **SC-007**: Every completed automated PASS has a recorded human ACCEPT or
  REJECT decision; service failures are reported separately and never as
  PASS.
- **SC-008**: Every tested relative deadline resolves to the specified
  calendar date in `YYYY-MM-DD` form, or to `null` with clarification when
  vague, unsupported, or missing a trustworthy meeting date.
- **SC-009**: 100% of action and decision quotes are contiguous source spans
  of 1–300 characters, with no sensitive value copied into any output field.
- **SC-010**: For cases containing revised commitments, only the final
  commitment is output; suggestions without explicit agreement produce no
  decision.
- **SC-011**: No action-item or decision list exceeds 25 entries, each
  truncated outcome list has an `about: "other"` clarification notice, and no
  required clarification question is omitted.
- **SC-012**: Every evaluated non-English transcript has task and summary
  text in English or the transcript's language that preserves annotated
  ground-truth meaning, and source quotes satisfy FR-009.
- **SC-013**: Every action and decision item has a
  `needs_clarification` boolean that agrees with whether a clarification
  question is linked to that item.

## Assumptions

- The caller supplies one transcript or rough-notes string per invocation;
  `context` is either `null` or an object whose optional `participants` field
  is a list of names and whose optional `meetingDate` field is a
  `YYYY-MM-DD` date. If the date is omitted, the function uses an unambiguous
  date stated in the transcript; it never substitutes the current date.
- Deadline values are represented using the unambiguous wording supported by
  the source; no date is inferred from the current date or unstated context.
- The LLM service and its provider are selected during planning. The service
  is available for evaluation through credentials supplied as environment
  variables; its outages are reported as service failures.
- The external evaluation harness, its dataset, and its acceptance controls
  are maintained separately from application code and are not changed by the
  coding agent during implementation.
- No fixed latency, throughput, availability, observability, or regulatory
  compliance target has been specified; these remain outside the acceptance
  criteria unless later requirements establish them.
- Phase 2 is the implementation phase. Its directory restrictions apply to
  the coding agent and do not authorize changes to protected evaluation
  artifacts.
