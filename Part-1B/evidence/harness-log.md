# Part-1B Harness Log: Non-Deterministic LLM Evaluation

## 1. Project Overview & Harness Architecture

The Part-1B implementation is an **AI-Enabled Meeting Action Item & Decision Extractor** built using Node.js (ESM), Ajv (JSON Schema Draft 2020-12), and an LLM-powered agent interface. Its primary function is to extract structured, verifiable action items, key decisions, summaries, and clarification questions from raw, unstructured meeting transcripts and rough notes.

Because LLMs introduce non-determinism into the software development life cycle, classical deterministic unit tests (e.g. strict string matching or exact equality assertions) are insufficient. The Part-1B harness implements a **4-layer bounded evaluation framework** designed to verify behavioral properties, structural validity, domain invariants, and semantic fidelity without requiring rigid word-for-word parity.

### The 4-Layer Evaluation Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Layer 1: Structural Gate                        │
│          Ajv JSON Schema (Draft 2020-12) validation (SCH-1)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Layer 2: Invariants Gate                        │
│   Domain rules: INV-1 (Outcomes), INV-2 (Clarifications),              │
│   INV-3 (ISO Deadlines), INV-4 (Participant Assignees),                │
│   INV-5 (Verbatim Quotes), INV-6 (No Leaks), INV-7 (No Control Chars)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Layer 3: Semantic & Behavioral Gate                 │
│   Token overlap, Levenshtein distance, micro-precision & recall,       │
│   BP-1 (No Guessing), BP-2 (Semantic Fidelity), BP-3 (Non-Commitments) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Layer 4: Aggregate Threshold Gate                   │
│   Statistical verification across full evaluation dataset              │
│   (Structural Pass Rate, Invariant Pass Rate, Mean Semantic Score)     │
└────────────────────────────────────────────────────────────────────────┘
```

The harness execution command from the `Part-1B/` directory is:

```sh
node .harness/run_eval.mjs --outputs evidence/final-outputs.json
```

Evaluation configurations and threshold specifications are located at:
- [Threshold Rules](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/.harness/threshold.json)
- [Requirement Mapping](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/.harness/requirements.json)
- [Input Lock Manifest](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/.harness/input-lock.json)

---

## 2. Feed-Forward Expectations & Specification Kit

In accordance with the Spec-Driven Development methodology emphasized in the course:
1. **Constitution (`.specify/memory/constitution.md`)**:
   - Ratified at Version 1.0.0, establishing core principles:
     - *Principle I (Specification-First Delivery)*: No code divergence without spec approval.
     - *Principle II (Bounded Non-Determinism)*: Outputs bounded to schema contracts and invariants.
     - *Principle III (Never Guess)*: Absent or vague assignees/deadlines mapped to `null` with clarification questions.
     - *Principle IV (Source Grounding)*: Every task and decision anchored by verbatim source quotes.
     - *Principle VI (Untrusted Input & Privacy)*: Redaction of API credentials and credit cards; prompt injection isolation.
2. **Contract Schema (`specs/001-meeting-action-extractor/contracts/response.schema.json`)**:
   - Strict definition requiring `actionItems`, `keyDecisions`, `summary`, and `clarificationQuestions`.
3. **Prompt Definition (`prompts/system_prompt.md`)**:
   - Formal system instructions providing zero-shot and few-shot formatting guardrails.

---

## 3. Evaluation Dataset & Self-Tests

The test suite evaluates 22 cases spanning 7 distinct challenge categories:
- **Normal Cases (`MA-01` to `MA-04`)**: Single and multi-action commitments, exact dates, decision-only transcripts.
- **Missing Information (`MA-05`, `MA-06`, `MA-21`)**: Missing deadlines, generic assignees ("someone"), relative offset dates.
- **Ambiguous Cases (`MA-07` to `MA-12`)**: Vague terms ("next week", "soon"), name collisions, parked/brainstormed ideas, revised commitments, task reassignments.
- **Boundary Cases (`MA-13`, `MA-16`, `MA-17`, `MA-22`)**: Small talk only, non-English transcript, past deadline rejection, chatty transcripts.
- **Malformed Inputs (`MA-14`, `MA-15`)**: Empty text, gibberish strings.
- **Adversarial Attacks (`MA-18`, `MA-19`)**: Instruction overrides ("Ignore previous instructions"), system prompt extraction.
- **Guardrails & Privacy (`MA-20`)**: Redaction of API credentials and payment cards (`[REDACTED]`).

### Harness Self-Tests
The evaluation harness itself was independently verified using `tests/harness.selfcheck.test.js` (`node --test tests/harness.selfcheck.test.js`). The test suite validates:
- Positive acceptance of ideal reference outputs (`evidence/harness-validation/ideal-outputs.json`).
- Negative detection and rejection of invalid outputs (`evidence/harness-validation/bad-outputs.json`).

---

## 4. Harness Executions & Iteration History

All evaluation executions were tracked and hash-chained in [`Part-1B/evidence/harness-runs.jsonl`](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/evidence/harness-runs.jsonl):

| Run | Timestamp (UTC) | Local Time (UTC+05:30) | Gate Status | Observed Outcome |
|---|---|---|---|---|
| [001](./results/run-001.json) | 2026-11-10 20:38:57 | 2026-11-11 02:08:57 | **FAIL** | Pipeline extraction failure: `TypeError: transcript must be a string` |
| [002](./results/run-002.json) | 2026-11-11 01:25:12 | 2026-11-11 06:55:12 | **FAIL** | Schema passed; Invariant failure due to property casing discrepancy |
| [003](./results/run-003.json) | 2026-11-12 09:02:16 | 2026-11-12 14:32:16 | **PASS** | All 4 evaluation layers passed across all 22 evaluation cases |

---

## 5. Failure Diagnosis and Self-Healing Repair

### Failure 1 (Run 001): Transcript Type Extraction
- **Diagnostic Feedback**: Preserved in [`evidence/feedback/run-001-feedback.md`](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/evidence/feedback/run-001-feedback.md).
- **Issue**: `src/extractor.mjs` assumed all dataset entries provided a flat `.transcript` property. Several dataset items supplied nested objects (`testCase.input.transcript`, `testCase.input.body`) or strings under `testCase.input`. This triggered `TypeError: transcript must be a string` in `src/agent.js:validateInput()`.
- **Repair**: Updated `src/extractor.mjs` to polymorphically resolve transcripts across string and object variants with fallback defaults, and normalized context fields (`meeting_date` -> `meetingDate`).

### Failure 2 (Run 002): Contract Property Casing Discrepancy
- **Diagnostic Feedback**: Preserved in [`evidence/feedback/run-002-feedback.md`](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/evidence/feedback/run-002-feedback.md).
- **Issue**: The agent prompt produced camelCase properties (`actionItems`, `keyDecisions`), whereas `.harness/evaluators/invariants.mjs` checked snake_case properties (`action_items`, `decisions`), causing `TypeError: Cannot read properties of undefined (reading 'length')`.
- **Repair**: Normalized property accessors in the evaluator pipeline and harmonized model contract serialization.

---

## 6. Final Evaluation Metrics & Threshold Verification (Run 003)

The final evaluation verified all 22 test cases against the strict thresholds defined in `.harness/threshold.json`:

| Metric Dimension | Threshold Required | Observed Result | Status |
|---|---|---|---|
| **Structural Pass Rate** | `1.00` (100%) | **`1.00`** (22/22) | **PASS** |
| **Invariant Pass Rate** | `≥ 0.95` (95%) | **`1.00`** (22/22) | **PASS** |
| **Mean Semantic Score** | `≥ 0.85` | **`1.00`** | **PASS** |
| **Micro Precision (Action Items)** | `≥ 0.85` | **`1.00`** | **PASS** |
| **Micro Recall (Action Items)** | `≥ 0.85` | **`1.00`** | **PASS** |
| **Guardrail Pass Rate** | `1.00` (100%) | **`1.00`** (3/3) | **PASS** |

The full evaluation output is persisted at [`Part-1B/evidence/eval-results.json`](file:///Users/dhruvdhiman/Documents/BITS/AI-Augmented%20Software%20Development%20Life%20Cycle/Assignment%201%20AISDLC/Part-1B/evidence/eval-results.json).

