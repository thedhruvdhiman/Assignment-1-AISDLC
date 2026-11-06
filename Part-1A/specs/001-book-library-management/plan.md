# Implementation Plan: Book Library Management System

**Branch**: `001-book-library-management` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-book-library-management/spec.md`

## Summary

Deliver a desktop Vue.js library application backed by an Express REST API and MongoDB.
The first screen is librarian sign-in; successful authentication reveals the dashboard,
catalog, book/member management, and lending workflows. Mongoose schemas and MongoDB
transactions preserve inventory, loan, and member-count consistency during issue and
return. Local setup uses ignored `.env` credentials and explicit, guarded bootstrap and
sample-data commands. The backend connects to the configured MongoDB before listening;
the root `npm run dev` starts the API and Vite frontend together.

## Technical Context

**Language/Version**: TypeScript on a currently supported Node.js LTS runtime

**Primary Dependencies**: Vue 3, Vite, Express, Mongoose, express-session with a MongoDB
session store, Argon2id password hashing, Jest, Supertest, Vitest, and Vue Test Utils

**Storage**: MongoDB replica set; Mongoose collections for books, members, loans, and
librarian accounts; server-side sessions in MongoDB. Local sample data is limited to an
explicit seed command targeting a local development database.

**Testing**: Jest and Supertest backend integration tests against a transaction-capable
test database; Vitest and Vue Test Utils component tests

**Target Platform**: Modern desktop browsers; Node.js server; MongoDB
deployment supporting multi-document transactions

**Project Type**: Web application with separate `frontend/` and `backend/` packages

**Performance Goals**: Meet the spec's catalog search target: at least 95% of searches
and filter changes display the first matching page within 2 seconds for 10,000 books.

**Constraints**: All application data endpoints require a librarian session; frontend
state is not an authorization boundary. Issue/return updates use short, sequential
operations inside MongoDB transactions. The service has best-effort availability and no
formal backup or recovery objective in this release. Store operational events without
credentials, session identifiers, or unnecessary member personal data. Never commit
real `.env` values. Development credentials are not available in production. Sample
seeding must be explicit, idempotent, and reject production or non-local database targets.

**Scale/Scope**: One branch; 10,000-book search performance target; one book record per
unique ISBN as defined by the spec; no configured member loan limit.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle or constraint | Plan response | Gate |
|---|---|---|
| Domain State Integrity | Issue and return are conditional, atomic MongoDB transactions; derived overdue state and deletion behavior preserve loan references. | PASS |
| Contract-First Full-Stack Design | Vue communicates only through the documented `/api` REST contract. | PASS |
| Validated Data and Safe Operations | Validate at API and Mongoose boundaries; enforce normalized unique indexes; return explicit errors. | PASS |
| Automated Verification | Cover transaction concurrency and API behavior with Jest/Supertest; cover Vue interactions with Vitest. | PASS |
| Predictable, Usable Workflows | Stable pagination and sorting, empty/error states, desktop UI, and WCAG 2.2 AA are planned. | PASS |
| Technology & Data Constraints | Vue/Vite, Express, MongoDB/Mongoose, ObjectId references, and a replica-set transaction environment are included. | PASS |
| Authentication boundary | Sign-in precedes the dashboard; all catalog/member/loan data APIs require a librarian session. | PASS |
| Local development setup safety | Credentials remain in ignored local env; sample seeding is explicit, idempotent, and local-only. | PASS |
| Availability and recovery | No SLA or recovery target is required for this release, as explicitly recorded in the spec. | PASS |

No constitution gate violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/001-book-library-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── openapi.yaml
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/       # account provisioning and local-only seed command
│   ├── services/
│   └── observability/
└── tests/
    ├── integration/
    └── support/

frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── views/
│   ├── router/
│   └── stores/
└── tests/
    └── components/
```

**Structure Decision**: Use two npm workspace packages in one repository. Keep the
frontend and backend separately runnable and testable, with all persistence and access
control in the backend. The API contract is the integration boundary.

## Design Decisions

- **Authentication**: Use opaque server-side sessions with an HttpOnly, Secure,
  SameSite=Lax cookie, a MongoDB-backed session store, CSRF tokens for state-changing
  requests, and Argon2id password hashes. An unauthenticated SPA session sees only the
  sign-in view; after sign-in the dashboard becomes available, and logout returns the UI
  to sign-in. Protect catalog reads as well as librarian mutations and member/loan reads.
  Do not expose public librarian registration.
- **Local librarian bootstrap**: Read `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` from
  ignored `backend/.env`; keep only placeholders in `.env.example`. The controlled
  provisioning command must run only when `NODE_ENV=development` and the MongoDB host
  is loopback, be safe to repeat, and never replace an existing account's password.
  Reject bootstrap in every other environment and never provide hardcoded credentials.
- **Sample data**: Provide a separate explicit development seed command for a small,
  fictional set of books and members. Use unique normalized identifiers to make runs
  idempotent. Reject production mode, non-loopback MongoDB hosts, and database names
  outside the local-development allowlist; do not invoke the seed automatically from
  `npm run dev`, since the active URI may point to a remote Atlas database.
- **Development startup and connectivity**: `npm run dev` starts frontend and backend
  concurrently. The backend loads `backend/.env`, validates required configuration,
  connects to `MONGODB_URI`, verifies transaction-capable topology, then listens on its
  API port. Startup must fail visibly and must not report the API ready if MongoDB is
  unreachable or standalone.
- **Overdue representation**: Derive the response status from `return_date` and
  `due_date` in the configured library time zone rather than relying on a scheduled
  status-changing job. Persist only the issue/return facts, so overdue status cannot go
  stale if a scheduled task is delayed or unavailable.
- **Loan history and deletion**: Reject deletion of books or members with active loans.
  Archive records with historical loans instead of physically removing referenced
  records; exclude archived records from ordinary catalog/member lists.
- **Dates**: Store issue and return instants as UTC timestamps. Store the due date as a
  calendar date interpreted using a required IANA `LIBRARY_TIME_ZONE` setting.
- **Errors and observability**: Return stable error codes and safe messages to clients.
  Record timestamps, outcomes, operation names, and non-sensitive resource identifiers;
  never log passwords, CSRF tokens, session IDs, or unnecessary member PII.

## Complexity Tracking

No constitution violations or exceptional complexity requiring justification.
