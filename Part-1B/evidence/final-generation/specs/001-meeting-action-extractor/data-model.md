# Data Model: Meeting Action Extractor

The public response shape is defined by [SCH-1](./contracts/response.schema.json).
The evaluator owns the corresponding runtime schema at
`.harness/response.schema.json`; it is copied from the approved contract without
changing its meaning.

## Input Entities

### Meeting Input

| Field | Type | Constraints | Source |
|---|---|---|---|
| `transcript` | string | One transcript or rough-notes text; whitespace-only input follows FR-012 | Required argument to `handle` |
| `context` | object or `null` | Defaults to `null` | Optional second argument |
| `context.meetingDate` | string or absent | Valid calendar date in `YYYY-MM-DD`; if absent, use only an unambiguous date stated in the transcript | Caller context or transcript |
| `context.participants` | array of strings or absent | Names that may be used for assignment only when supported by the transcript/participant context | Caller context |

`context` contains no other recognized data. Input types and date shape are
validated before the model call. Invalid caller input is an input error, not a
`ModelServiceError`.

## Output Entities

### Action Item

| Field | Type | Constraints |
|---|---|---|
| `task` | non-empty string | Source-supported commitment; only final revised form is output |
| `assignee` | string or `null` | Person appears in transcript or participants; unresolved, generic, or unaccepted ownership is `null` |
| `deadline` | `YYYY-MM-DD` string or `null` | Must be unambiguous, not before meeting date; never compare against system date |
| `source_quote` | string | 1–300 characters; one contiguous transcript span with sensitive values replaced by `[REDACTED]` |
| `needs_clarification` | boolean | `true` iff at least one action-item clarification references this item's output index |

### Key Decision

| Field | Type | Constraints |
|---|---|---|
| `decision` | non-empty string | Explicitly agreed or explicitly stated to have been decided; a suggestion alone is not a decision |
| `source_quote` | string | 1–300 characters; one contiguous transcript span with sensitive values replaced by `[REDACTED]` |
| `needs_clarification` | boolean | `true` iff at least one decision clarification references this item's output index |

### Clarification Question

| Field | Type | Constraints |
|---|---|---|
| `question` | non-empty string | Names the missing, vague, ambiguous, conflicting, or truncated information |
| `about` | enum | `actionItem`, `decision`, `transcript`, or `other` |
| `itemIndex` | zero-based integer or `null` | Required index into the matching output list for item questions; `null` for transcript/overflow |

Questions about output items must be generated after final item ordering and
truncation so their indexes refer to the returned arrays. An item's
`needs_clarification` flag and linked questions are a bidirectional invariant.
Transcript-wide and overflow questions do not set an item flag.

### Response

| Field | Type | Constraints |
|---|---|---|
| `actionItems` | array | At most 25; preserve first 25 final commitments in source order |
| `keyDecisions` | array | At most 25; preserve first 25 decisions in source order |
| `summary` | string | At most three sentences; no unsupported facts; English or transcript language |
| `clarificationQuestions` | array | No count cap; return every required item-linked and transcript-level question |

If either result array is truncated, an `about: "other"` overflow question is
required. One notice may describe multiple outcome-list truncations. No
clarification question is dropped to meet an item limit.

## Evaluation Entities

### Evaluation Case

Exactly 22 immutable cases each contain an input, expected result or expected
`ModelServiceError`, case category, ground truth, and one or more Spec
requirement IDs. Successful extraction cases enter semantic scoring;
controlled service-failure cases are checked against the expected error
contract and are excluded from the semantic-score denominator.

### Evaluation Run

A run records configuration (including repeat count and lock/snapshot mode),
per-case application outcomes, schema results, invariant violations, semantic
category scores, aggregate score, and PASS/FAIL. First-generation outputs and
structured failure records are preserved before any application repair.

## Error Model

`ModelServiceError` represents provider/network/rate-limit/timeout failures and
malformed model output that cannot be accepted as a valid response. It is
propagated; it never becomes a fabricated or empty response object. Invalid
caller argument types are reported as input errors, not model-service errors.

## Requirement Traceability

- Meeting input and context: FR-001, FR-007–FR-008, FR-012, FR-024, FR-028.
- Response and item entities: FR-002–FR-009, FR-023–FR-029.
- Evaluation case and run: FR-013–FR-018; SC-001–SC-012.
- Error model: FR-014, FR-017–FR-018, FR-027.
