# Quickstart: Book Library Management System

## Prerequisites

- Node.js and npm.
- MongoDB running as a replica set or sharded cluster; issue/return workflows require transactions.
- A valid IANA time-zone name for the library.

## Local development configuration

1. Copy `backend/.env.example` to `backend/.env` if the local file does not exist.
2. Set `MONGODB_URI` to the intended development database. For the sample-data seed
   command, this must point to the allowlisted local development database on a local
   replica set. If `MONGODB_URI` points to Atlas or another remote host, do not run the
   seed command.
3. Set a high-entropy `SESSION_SECRET` of at least 32 characters, `LIBRARY_TIME_ZONE`,
   `LIBRARIAN_EMAIL`, and a strong `LIBRARIAN_PASSWORD` of at least 12 characters.
   Keep `backend/.env` untracked and private; example files contain placeholders only.
4. Run `npm run provision:librarian -w backend` to create the configured librarian.
   The command is safe to repeat without overwriting an existing account and refuses
   production, non-local, or unapproved database targets.
5. Run `npm run seed:dev -w backend` to insert fictional sample books and members. The
   command is explicit, safe to repeat, and refuses production, non-local, or
   unapproved database targets. It does not create loans.
6. Run `npm run dev` from the project root. Vite serves the frontend on port 5173.
   The backend loads its environment, connects to the configured MongoDB, checks that
   transactions are supported, and then listens on port 3000. If MongoDB cannot be
   reached or lacks transaction support, backend startup fails and the API does not
   become available.
7. Open the frontend. Without a librarian session, only the sign-in screen is shown.
   Sign in with `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` to open the dashboard.
   Sign-out invalidates the session and returns to sign-in.
8. Add a book from the dashboard's book-management workflow. Confirm it appears in the
   catalog and can be filtered/searched. Issue and return a sample book to verify the
   due date and member active-loan count.

To use a remote Atlas database for ordinary development, configure its URI in
`backend/.env`; `npm run dev` connects to that configured database. Do not run either
development provisioning or sample-data commands with the remote URI. Remote librarian
accounts must be provisioned through a separately authorized deployment process; do not
enable public librarian registration.

## Automated validation

Run these commands from the project root:

- `npm test` — Jest/Supertest tests use a MongoDB in-memory replica set; the first run
  may download its MongoDB test binary. Vitest/Vue Test Utils checks the frontend.
- `npm run typecheck` — checks backend TypeScript and Vue/TypeScript types.
- `npm run build` — compiles the API and creates the production frontend bundle.
- `npm audit --omit=dev` — checks production dependencies for known advisories.

Latest verification: `npm test` passed 37 backend tests across six Jest suites and
22 frontend tests across two Vitest suites. `npm run typecheck`, `npm run build`, and
`npm audit --omit=dev` also passed; the audit reported zero production vulnerabilities.
The local-only seed command is guarded and has not been run against the configured
database. Run it only after confirming `backend/.env` targets an allowlisted local
development database.

Integration coverage includes authentication boundaries, CSRF enforcement, book and
member CRUD, duplicate identifiers, issue/return consistency, concurrent issue attempts,
missing-member rollback, overdue filtering, and health status. Contract details are in
[contracts/openapi.yaml](./contracts/openapi.yaml); entities and invariants are in
[data-model.md](./data-model.md).

## Verify archive restoration

1. Sign in as a librarian and open book management. Confirm delete archives rather than
   permanently removes a book, and that the Active and Archived views are easy to find.
   Confirm active mode excludes archived books, then open Archived books and find the
   deleted record.
2. Restore an archived book. Confirm it leaves archived mode and appears in the active
   catalog with its original ID, status, and loan-history references intact.
3. Repeat the delete, browse, and restore flow for a member. Confirm the restored member
   appears in the active member list with its original ID and active-loan count.
4. Confirm an active book/member cannot be restored again, an unknown ID is reported as
   not found, and unauthenticated or CSRF-invalid restore requests are rejected.
5. Confirm an archived ISBN/email remains reserved, so restoring the original record
   does not create a duplicate identifier.

Run `npm test` and `npm run typecheck` from `Part-1A/`. The backend integration tests
must exercise archive-filtered pagination, restore persistence and invalid transitions,
authorization/CSRF, and the frontend tests must exercise the archived mode, restore
action, and resulting active-list refresh. The contract test must assert both restore
paths and the archived list parameter. Successful restores return the record to the
ordinary catalog/member workflow without changing its preserved state.

## Operational checks

- `GET /api/health` returns `200` with `status: "ok"` while MongoDB is connected and
  `503` otherwise.
- Confirm unauthenticated catalog API requests are rejected and sign-in is required
  before the dashboard is rendered.
- Confirm successful and failed sign-in plus issue/return operations produce structured
  event records without passwords, CSRF tokens, session IDs, or unnecessary member PII.
- Starting against an unreachable or standalone MongoDB instance must fail visibly
  rather than silently weakening transaction guarantees.
- Confirm both development setup commands refuse production, remote MongoDB targets,
  and unapproved database names, and can be repeated without creating duplicate sample
  records or overwriting credentials.
