# Public Function Contract

## Export

```js
export async function handle(transcript, context = null)
```

`handle` resolves to one object conforming to [SCH-1](./response.schema.json).
It accepts a transcript string and optional context:

```json
{
  "meetingDate": "2026-11-10",
  "participants": ["Avery Chen", "Jordan Lee"]
}
```

Either context property may be omitted. `meetingDate` is an ISO calendar date.
Transcript-stated date is used only when the caller did not supply a date.
Conflicting caller and transcript dates make relative deadlines unresolved.
No current-system-date fallback is allowed.

## Behavior

1. Validate transcript and context types; reject invalid caller input.
2. Require `MEETING_PROVIDER=openai`, a supported `MEETING_MODEL`,
   `MEETING_TEMPERATURE` from 0.0 through 0.2 supported by that model, and
   `OPENAI_API_KEY`; read all configuration and credentials from the
   environment only.
3. Compose the version-controlled system prompt with the transcript clearly
   labeled and delimited as untrusted data.
4. Make one low-temperature request to
   `https://api.openai.com/v1/responses`, with a 30-second timeout and no
   automatic retry.
5. Check HTTP status and API response state, reject refusals or incomplete
   responses, and extract the actual text output rather than assuming a fixed
   response-array position.
6. Parse JSON, including removal of an outer Markdown code fence, without
   evaluating model text.
7. Validate the response against SCH-1.
8. Apply deterministic post-checks: validate/redact supporting spans, discard
   unsupported quote items, null generic/unknown assignees, resolve only
   permitted deadlines, null past/invalid deadlines relative to meeting date,
   redact sensitive values from every field, restore required item
   clarifications, cap action and decision lists at 25, and synchronize item
   flags while retaining every required clarification question.
9. Revalidate the post-checked object against SCH-1 and return it.

Provider, network, rate-limit, timeout, malformed-response, or invalid-model
output failures raise `ModelServiceError`; they never return an empty or
success-shaped fallback. The harness imports only `handle` and
`ModelServiceError`, not application validation or helper modules.

## Requirement Mapping

FR-001–FR-012, FR-019–FR-020, FR-023–FR-029.
