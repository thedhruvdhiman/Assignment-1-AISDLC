## Clarifications

### Session 2026-11-10

- Q: How is the reference meeting date determined for relative deadlines?
  → A: Use a caller-supplied date or an unambiguous date stated in the transcript;
  if neither is available, leave the deadline null and ask for clarification.
- Q: Does the 25-item limit include clarification questions?
  → A: Yes. Cap every list at 25; if clarification questions overflow, keep the
  first 24 and use the final slot for an `about: "other"` overflow question.
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