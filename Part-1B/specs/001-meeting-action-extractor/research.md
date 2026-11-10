# Research: Meeting Action Extractor

## Node.js 20+ ES Modules and `node:test`

**Decision**: Set `"type": "module"` in the project manifest and retain the
user-required `.js` paths for `agent.js` and the self-check test. Use explicit
file extensions in relative ESM imports. Tests use async `node:test` callbacks
and await the function under test.

**Rationale**: Explicit ESM configuration avoids ambiguity across supported
Node versions. The built-in test runner awaits returned promises and reports
failures through its normal non-zero exit status.

**Alternatives considered**: Use `.mjs` for every source file. This is also
valid but conflicts with the exact requested `.js` file names; `"type":
"module"` provides the same explicit module boundary.

**Sources**:

- [Node.js 20 ESM: enabling](https://nodejs.org/docs/latest-v20.x/api/esm.html#enabling)
- [Node.js packages: determining module system](https://nodejs.org/docs/latest-v20.x/api/packages.html#determining-module-system)
- [Node.js 20 test runner](https://nodejs.org/docs/latest-v20.x/api/test.html#test-runner)
- [Node.js test runner: command line](https://nodejs.org/docs/latest-v20.x/api/test.html#running-tests-from-the-command-line)

## Ajv and JSON Schema 2020-12

**Decision**: Use Ajv's dedicated 2020-12 implementation (`Ajv2020`, from its
2020-specific entry point) with `strict: true`. Validate the canonical SCH-1
schema and do not enable date-format keywords unless an explicit format
plugin is added and approved.

**Rationale**: Draft 2020-12 uses a dedicated Ajv class and cannot be mixed
with earlier schema drafts in the same instance. Strict mode makes invalid or
unknown schema constructs fail early. SCH-1 uses a date pattern plus
deterministic calendar-date validation, avoiding an unrequested format
dependency.

**Alternatives considered**: Ajv's default class, which targets a different
draft and is not the correct validator for SCH-1; adding `ajv-formats`, which
is unnecessary for the current schema; or implementing custom schema
validation, which duplicates the canonical contract.

**Sources**:

- [Ajv JSON Schema versions: draft 2020-12](https://ajv.js.org/json-schema.html#draft-2020-12)
- [Ajv strict mode](https://ajv.js.org/strict-mode.html)
- [Ajv strict options](https://ajv.js.org/options.html#strict)
- [Ajv format validation](https://ajv.js.org/guide/formats.html)

## One LLM Provider Through Native `fetch`

**Decision**: Use native `fetch` to call the OpenAI Responses API. Accept only
`MEETING_PROVIDER=openai`; read `OPENAI_API_KEY`, `MEETING_MODEL`, and
`MEETING_TEMPERATURE` from the process environment. The configured model must
support a numeric low temperature; reject unsupported or invalid
configuration rather than silently dropping the setting. Use a fixed
30-second request timeout via `AbortSignal.timeout()`, one request per call,
and no automatic retry. Every non-success HTTP response, network error,
timeout, refusal, incomplete response, or unusable model response raises
`ModelServiceError`.

Request a JSON response in the prompt and always parse, validate with Ajv
against SCH-1, and run deterministic checks. Provider-level structured
outputs may be considered only if the selected model accepts the complete
schema; they do not replace local validation. HTTP error details may be
included in the thrown error for debugging, but credentials, transcript
content, and sensitive response data are never logged or persisted.

**Rationale**: Native `fetch` avoids another runtime SDK and its lockfile
change. The Responses API is the provider's recommended API for new text
generation. Explicitly checking `response.ok` is necessary because `fetch`
does not reject on HTTP error status. Abort signals allow timeouts to be
reported distinctly as model-service failures. No retry avoids concealing a
service failure or producing extra model generations outside the expected
single-call behavior.

**Alternatives considered**: An official provider SDK, which adds a runtime
dependency not necessary for this narrow request; multiple provider adapters,
which violate the one-provider scope; and blind retry, which could hide rate
limits, quota failures, or timeouts.

**Provider caveats**:

- `MEETING_PROVIDER` has only one supported value, `openai`; it does not
  enable provider switching.
- The selected model's current API documentation must confirm support for
  the configured temperature. A rejected request is a `ModelServiceError`.
- OpenAI structured outputs support a constrained JSON Schema subset and
  model-dependent availability. Ajv validation and deterministic invariants
  remain mandatory whether or not provider-side constrained output is used.
- HTTP 429 and temporary overload responses are reported as
  `ModelServiceError`; the application does not retry them.
- Responses may contain multiple output item types; extract the actual
  `output_text` content and handle refusal/incomplete states rather than
  treating the first array item as the generated answer.

**Sources**:

- [OpenAI text generation](https://developers.openai.com/api/docs/guides/text)
- [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [OpenAI API keys](https://developers.openai.com/api/docs/guides/api-keys)
- [OpenAI authentication](https://developers.openai.com/api/reference/overview#authentication)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes)
- [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [Node.js `fetch` and `AbortSignal.timeout`](https://nodejs.org/api/globals.html#fetch)

## Evaluation Contract and Ownership

**Decision**: The external evaluator owns the 22-case dataset, EVAL-1
threshold, schema, requirements catalog, harness, self-check tests, lock, and
generated evidence. It imports only `handle` and `ModelServiceError`. The
coding agent may run, but not edit, those protected artifacts during Phase 2.

**Rationale**: This preserves independent acceptance, prevents the evaluated
implementation from weakening its tests or threshold, and complies with the
constitution's Phase 2 write boundary. The project owner must provision the
Ajv dependency and protected evaluation inputs before Phase 2 begins.

**Alternatives considered**: Letting the implementation agent create or adjust
its own evaluator, which would violate independent validation and agent-limit
principles.

**Sources**:

- [Project constitution](../../.specify/memory/constitution.md), Principles
  VII–XII and Runtime and Security Requirements.
- [Feature specification](./spec.md), FR-013–FR-018 and FR-021–FR-022.
