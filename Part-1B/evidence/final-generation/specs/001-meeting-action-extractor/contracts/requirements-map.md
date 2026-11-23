# Requirement Mapping

The evaluator-owned `.harness/requirements.json` contains one `{ "id", "text" }`
record for every functional requirement in `spec.md`. The harness validates
case traceability against these IDs. This map additionally assigns ownership
and identifies the prompt sections that serve the requirements.

## Task Traceability IDs

The following stable task-trace IDs are aliases to approved functional and
success requirements; they add no acceptance criteria and do not replace the
canonical FR/SC IDs in `.harness/requirements.json`.

| Trace ID | Meaning | Canonical requirements |
|---|---|---|
| SCH-1 | Exact response schema contract | FR-002–FR-006a, FR-009, FR-026, FR-029 |
| INV-1 | Schema shape, indexed clarifications, item-flag consistency | FR-002–FR-006a, FR-029; SC-001, SC-013 |
| INV-2 | Source membership, date validity, list limits, and privacy properties | FR-008–FR-010, FR-024, FR-026, FR-028; SC-003, SC-009, SC-011 |
| BP-1 | Source-grounded extraction and no-guess behavior | FR-003–FR-008, FR-011–FR-012, FR-023–FR-025; SC-004–SC-005, SC-008, SC-010, SC-012 |
| GR-1 | Injection resistance and sensitive-data guardrails | FR-009–FR-010, FR-020; SC-003, SC-009 |
| EVAL-1 | Fixed dataset scoring formula, weights, and threshold | FR-013–FR-016; SC-001–SC-002, SC-006 |
| HR-1–HR-9 | Evaluator CLI, replay/lock/snapshot, run reporting, and evidence workflow | FR-013–FR-018; SC-001–SC-007 |
| HR-11 | Protected harness self-check suite | FR-014–FR-018; SC-001–SC-007 |

These aliases are used only to make task descriptions concise. Dataset cases
and requirement catalogs continue to use the canonical FR IDs from `spec.md`.

| Requirement area | Requirements | Primary owner |
|---|---|---|
| Input, context, and public response | FR-001–FR-006, FR-006a | `agent.js`; SCH-1 |
| Ambiguity, source membership, and no guessing | FR-007–FR-008, FR-023–FR-024, FR-028–FR-029 | system prompt; deterministic invariants |
| Source quotes, privacy, and injection resistance | FR-009–FR-010, FR-020 | prompt; deterministic post-check; adversarial evaluator |
| Action/decision qualification and revisions | FR-011 | prompt; semantic evaluator |
| Empty/invalid input and model failure | FR-012, FR-027 | `agent.js`; `errors.js`; structural evaluator |
| Dataset and independent pipeline | FR-013–FR-014 | evaluator-owned dataset and harness |
| Scoring and threshold | FR-015–FR-016 | evaluator-owned threshold and scoring modules |
| Failure evidence, service reporting, human decision | FR-017–FR-018 | harness outputs and human review |
| Runtime architecture and credentials | FR-019–FR-020 | package/runtime setup; `agent.js` |
| Specification-first and agent restrictions | FR-021–FR-022 | workflow governance; not application behavior |
| Language, outcome-list caps, and item flags | FR-025–FR-026, FR-029 | prompt; schema; deterministic invariants |

## Versioned System Prompt Sections

| Prompt section | Requirements served |
|---|---|
| Role, extraction objective, and exact response shape | FR-002–FR-006 |
| Transcript delimiters and instruction-injection resistance | FR-010 |
| Commitment vs. hypothetical/rejected/brainstormed content | FR-003, FR-008, FR-011 |
| Decision evidence and explicit agreement | FR-004, FR-011 |
| Revisions and final commitment selection | FR-008 |
| Ownership, acceptance, and participant grounding | FR-007–FR-008 |
| Meeting date and deadline interpretation | FR-001, FR-007–FR-008, FR-024, FR-028 |
| Quote selection, contiguity, and sensitive-value redaction | FR-009–FR-010 |
| Clarification links and `needs_clarification` flags | FR-006–FR-007, FR-029 |
| Language choice | FR-025 |
| Action/decision limits and overflow notice; no question truncation | FR-026 |

Prompt guidance does not replace deterministic schema, invariant, or privacy
checks. The evaluator's copy of this mapping is external to Phase 2 edits.
