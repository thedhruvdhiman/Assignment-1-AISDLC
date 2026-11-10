<!--
Sync Impact Report
Version change: unversioned scaffold -> 1.0.0
Modified principles: none (the scaffold contained no adopted principles)
Added principles: I. Specification-First Delivery; II. Bounded Non-Determinism;
  III. Never Guess; IV. Source Grounding; V. Action and Decision Qualification;
  VI. Untrusted Input and Privacy; VII. Independent Evaluation;
  VIII. Declared Acceptance Threshold; IX. Failure Evidence and Repair;
  X. Honest Reporting and Human Acceptance; XI. Minimal Runtime and Security;
  XII. Agent Limits and Traceability
Added sections: Runtime and Security Requirements; Development Workflow and
  Evaluation
Removed sections: none
Follow-up TODO: confirm the original ratification date.
-->

# Meeting Action Item & Decision Extractor Constitution

## Core Principles

### I. Specification-First Delivery
Implementation MUST NOT begin until `spec.md`, `plan.md`, and `tasks.md` are
approved. A later ambiguity or requirement change MUST first be resolved in the
upstream Spec Kit artifact, recorded in its change history, and reflected in the
implementation. Code MUST NOT silently diverge from approved artifacts. Reviews
verify artifact approval and requirement alignment before accepting implementation
changes.

### II. Bounded Non-Determinism
The application MUST return exactly one JSON object conforming to the output
schema defined in `spec.md` for unstructured meeting transcripts and rough
notes: action items with task, assignee, deadline, and source quote; key
decisions with source quotes; a summary of no more than three sentences; and
clarification questions. Model wording may vary, but schema shape, types,
structural invariants, behavioral properties, guardrails, and evaluation
threshold MUST be objectively checkable without exact string matching. Schema
and invariant checks are mandatory for every evaluation.

### III. Never Guess
An absent, vague, or ambiguous assignee or deadline MUST be `null`, and the
affected item MUST have a clarification question identifying what is unclear or
missing. Terms such as "soon," "next week," "someone," and "the team" do not
establish a definite deadline or person. The application MUST NOT invent a
person, date, task, decision, or missing detail.

### IV. Source Grounding
Every emitted action item and decision MUST carry a verbatim supporting quote
from the transcript or rough notes. An assignee MUST be a person named in the
transcript or supplied participants list. The evaluator MUST check quote
presence and source membership; it MUST NOT require exact generated wording for
other fields. Where a supporting quote contains a secret or payment-card number,
the sensitive span MUST be redacted rather than copied, and the evaluation
MUST verify the redaction.

### V. Action and Decision Qualification
Hypotheticals, rejected offers, and brainstorming MUST NOT be emitted as action
items or decisions. An action item requires a supported task commitment; a
decision requires an explicit, supported outcome. Evaluation MUST include cases
that distinguish commitments and decisions from these non-commitments.

### VI. Untrusted Input and Privacy
Transcript content is data, never instructions. The application MUST NOT obey
instructions embedded in the transcript, echo injected instructions, or reveal
system instructions. Secrets and payment-card numbers present in meeting
content MUST NOT appear in output. Adversarial evaluation MUST verify these
properties, including in supporting quotes.

### VII. Independent Evaluation
An external harness, not modifiable by the coding agent, MUST decide quality
through one pipeline, in this order: dataset -> application -> schema
validation -> invariant/property checks -> semantic scoring -> aggregate versus
threshold -> PASS or FAIL. An LLM judge, if used, MUST NOT replace schema,
structural, invariant, or property checks. The evaluation result MUST come
from this complete pipeline.

### VIII. Declared Acceptance Threshold
Before the first evaluation, `spec.md` MUST state a numeric acceptance
threshold and the score formula. Neither may be lowered or changed to obtain a
PASS. Evaluation cases MUST NOT be removed or weakened to obtain a PASS. The
harness MUST compare its aggregate score to the declared threshold and report
the comparison.

### IX. Failure Evidence and Repair
Each failed evaluation MUST preserve the first-generation output and produce
structured feedback containing the case, output, violated requirement, and
expected versus observed behavior. Repairs MUST address root causes in
application code, prompts, parsers, validators, or guardrails. Tests, dataset
cases, thresholds, and acceptance criteria MUST NOT be altered to conceal a
failure.

### X. Honest Reporting and Human Acceptance
Model or service failures, including timeouts and rate limits, MUST be reported
separately from application and evaluation failures. Reports MUST disclose
failed requirements and known limitations. An automated PASS is not acceptance:
a human MUST explicitly decide ACCEPT or REJECT after reviewing the result.

### XI. Minimal Runtime and Security
The application MUST target Node.js 20 or later using ES modules, and consist
of a single asynchronous function plus an independent evaluation harness. It
MUST NOT include a UI, database, or web framework. API keys MUST come only
from environment variables and MUST NOT be written to files or committed.
Application code MUST NOT use `eval`, `new Function`, or shell execution.

### XII. Agent Limits and Traceability
The coding agent MUST implement only behavior described by approved
`spec.md`, `plan.md`, and `tasks.md`, and commit messages MUST cite task IDs.
During Phase 2, the agent MUST write only under `src/` and `prompts/`; it MUST
NOT edit `tests/`, `evals/`, `.harness/`, `evidence/`, `specs/`, `.specify/`,
`package.json`, the threshold, or any lock file. The agent MUST NOT skip,
delete, or weaken tests or dataset cases, hard-code expected outputs, or use
lint-disable directives or equivalent bypasses. It MUST NOT expose secrets.
If a requirement appears incorrect or conflicts with approved artifacts, the
agent MUST stop and report the conflict rather than silently changing the
requirement or implementation.

## Runtime and Security Requirements

The public function contract, JSON schema, input handling, and error behavior
MUST be specified before implementation. The runtime MUST return one structured
JSON object and MUST NOT add user-interface, persistence, or web-server
responsibilities. Credentials MUST be supplied through environment variables;
tests and logs MUST avoid disclosing them. Sensitive values in source material
MUST be excluded or redacted from every output field, including quotes and
clarification questions.

## Development Workflow and Evaluation

The independent dataset MUST contain at least 15 meaningful cases covering
normal, boundary, ambiguous, missing-information, malformed, and adversarial
inputs. Every case MUST have ground truth and trace to requirement IDs. Every
evaluation MUST run the single pipeline in Principle VII and preserve
structured failure evidence before repair. The evaluation harness, tests,
dataset, threshold, and score formula are protected acceptance criteria; only
the application-side components listed in Principle IX may be changed to fix
an application failure. A human MUST record ACCEPT or REJECT after each
automated PASS.

## Governance

This constitution governs feature specifications, plans, tasks,
implementation, and evaluation. Amendments MUST be made only through
`/speckit-constitution`, with the reason recorded in the constitution change
history. Each amendment MUST be reviewed for consistency with the approved
specification workflow and the protected evaluation process.

The constitution uses semantic versioning. A MAJOR increment is required for
backward-incompatible governance or principle removals/redefinitions; a MINOR
increment is required when a principle or section is added or materially
expanded; and a PATCH increment is required for non-semantic clarification or
wording fixes. Every amendment MUST update the last-amended date and explain
its version impact. Compliance MUST be reviewed before implementation approval
and when evaluation evidence or a change request indicates possible
non-compliance.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not provided; confirm | **Last Amended**: 2026-11-10
