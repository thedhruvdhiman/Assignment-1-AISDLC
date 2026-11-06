---
description: "Implementation tasks for the Book Library Management System"
---

# Tasks: Book Library Management System

**Input**: Design documents from `/specs/001-book-library-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, and `contracts/openapi.yaml`

**Organization**: Tasks are grouped by user story so each increment can be implemented
and tested independently. The specification's first story, "Sign In to the Librarian
Dashboard" (labeled User Story 0 there), is mapped to `[US1]` below; subsequent stories
are shifted by one label to keep task story IDs sequential.

**Tests**: Required by the constitution and plan. Add automated tests before the
corresponding implementation and verify the tests fail for the intended missing behavior.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Tasks can run concurrently because they affect separate files and have no
  unfinished dependency on one another.
- **[Story]**: User-story label; setup, foundational, and polish tasks have no story label.
- Every task names its target file paths.

## Phase 1: Setup

**Purpose**: Prepare local configuration and scripts without exposing secrets or
implicitly modifying a database.

- [X] T001 Document required runtime configuration, ignored local env setup, development commands, and the explicit seed safety warning in `README.md` and `backend/.env.example`
- [X] T002 Add commented `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` placeholders (not usable credentials) to `backend/.env.example`
- [X] T003 Add separate explicit `provision:librarian` and `seed:dev` workspace commands in `backend/package.json`; do not attach either command to root `npm run dev`, install, or build scripts in `package.json`
- [X] T004 Add development env validation tests covering paired credentials, password length, and production rejection in `backend/tests/unit/development-database.test.ts`

---

## Phase 2: Foundational

**Purpose**: Establish secure environment guards, data access boundaries, and startup
behavior required before the story-specific UI and database workflows.

**Checkpoint**: All librarian data routes require an authenticated session; configuration
is loaded before startup; local-only setup operations fail closed for remote targets.

- [X] T005 [P] Implement safe MongoDB URI parsing and loopback/database-allowlist validation for local setup commands in `backend/src/config/development-database.ts`
- [X] T006 [P] Add environment schema validation for librarian credentials and `NODE_ENV`, plus local database allowlist validation in `backend/src/config/environment.ts` and `backend/src/config/development-database.ts`
- [X] T007 Add backend integration tests asserting unauthenticated book collection/detail, member, and loan reads return 401 in `backend/tests/integration/library-api.test.ts`
- [X] T008 Protect every book read route with librarian-session authorization while preserving health and session bootstrap routes in `backend/src/routes/books.routes.ts` and `backend/src/app.ts`
- [X] T009 Verify dotenv initialization precedes session configuration and preserve the sequence validate-env → connect MongoDB → verify transaction topology → listen in `backend/src/server.ts` and `backend/src/config/session.ts`
- [X] T010 Add backend startup tests for missing environment, unreachable MongoDB, and non-transaction-capable topology in `backend/tests/integration/startup.test.ts`
- [X] T011 Add API-client state-clearing support for sign-out and authentication failures in `frontend/src/api/client.ts`

---

## Phase 3: User Story 1 - Sign In to the Librarian Dashboard (Priority: P1) 🎯 MVP

**Goal**: Start at a dedicated login screen and show the dashboard only after successful
librarian authentication.

**Independent Test**: With no session, open the app and confirm only sign-in is shown and
no catalog/member/loan request is made. Sign in with a provisioned account to see the
dashboard; sign out and verify protected UI and session access are removed.

### Tests for User Story 1

- [X] T012 [P] [US1] Add component tests for signed-out login-only rendering, absence of data requests, login failure, successful login, sign-out, and expired sessions in `frontend/tests/components/CatalogView.test.ts`
- [X] T013 [P] [US1] Add Supertest coverage for session bootstrap, invalid credentials, session regeneration, logout invalidation, and protected catalog reads in `backend/tests/integration/library-api.test.ts`
- [X] T014 [P] [US1] Add provisioning tests for missing/weak credentials, non-development/remote targets, first creation, and repeat-run no-op in `backend/tests/unit/development-database.test.ts` and `backend/tests/integration/library-api.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Require development mode, an allowlisted loopback database, valid env credentials, Argon2id hashing, and idempotent no-overwrite provisioning in `backend/src/scripts/provision-librarian.ts` and `backend/src/services/librarian-provisioning.service.ts`
- [X] T016 [US1] Add dashboard authentication initialization with explicit loading, login-only unauthenticated state, and no catalog data request before authentication in `frontend/src/App.vue`
- [X] T017 [US1] Render the sign-in form as the primary unauthenticated screen and expose catalog/navigation/dashboard only after authentication in `frontend/src/App.vue` and `frontend/src/styles.css`
- [X] T018 [US1] Clear cached page data, selected records, errors, and CSRF state after logout and return focus to the sign-in heading in `frontend/src/App.vue` and `frontend/src/api/client.ts`
- [X] T019 [US1] Add accessible login error, progress, and session-status announcements with keyboard focus behavior in `frontend/src/App.vue` and `frontend/src/styles.css`

**Checkpoint**: A librarian can sign in to reach the dashboard; sign-out or a missing
session never leaves protected data visible.

---

## Phase 4: User Story 2 - Manage the Catalog (Priority: P1)

**Goal**: Let an authenticated librarian add, retrieve, update, and archive books from
the dashboard.

**Independent Test**: Sign in, create a valid book, find and update it, reject duplicate
ISBN and invalid values, and archive it only when no active loan exists. Direct API
requests without a librarian session must fail.

### Tests for User Story 2

- [X] T020 [P] [US2] Add integration coverage for authenticated book CRUD, required-field validation, duplicate normalized ISBN, missing IDs, and active-loan archive guards in `backend/tests/integration/library-api.test.ts`
- [X] T021 [P] [US2] Add dashboard component tests for book creation after login, required inputs, duplicate/API errors, and successful list refresh in `frontend/tests/components/CatalogView.test.ts`

### Implementation for User Story 2

- [X] T022 [US2] Align book create/read/update/archive handlers and error responses with the authenticated contract in `backend/src/routes/books.routes.ts` and `backend/src/services/book.service.ts`
- [X] T023 [US2] Ensure book records enforce required trimmed non-empty title/author/category, required display ISBN, normalized unique ISBN, enum status `available|issued|maintenance`, and creation/update timestamps in `backend/src/models/book.model.ts`
- [X] T024 [US2] Provide signed-in book creation and edit forms with validation, duplicate feedback, saving state, and refreshed dashboard inventory in `frontend/src/App.vue`
- [X] T025 [US2] Update the OpenAPI contract to require librarian sessions for book collection and individual reads, and confirm book CRUD response/error shapes in `specs/001-book-library-management/contracts/openapi.yaml`

**Checkpoint**: Only authenticated librarians can see or change books, and newly added
books appear in the dashboard catalog.

---

## Phase 5: User Story 3 - Issue and Return Books (Priority: P1)

**Goal**: Issue an available book and process its return atomically across book, loan,
and member state.

**Independent Test**: With a member and available book, issue once and verify issued
status, one loan, due date, and incremented member count. Reject unavailable and
concurrent duplicate issues; return once and verify all related state is reversed.

### Tests for User Story 3

- [X] T026 [US3] Add integration tests for issue/return success, unavailable books, missing member rollback, repeated return, and transaction rollback in `backend/tests/integration/library-api.test.ts`
- [X] T027 [US3] Add concurrent issue tests asserting at most one active loan and one member-count increment in `backend/tests/integration/library-api.test.ts`
- [X] T028 [P] [US3] Add component tests for member selection, issue confirmation, due-date display, return confirmation, loading, and API errors in `frontend/tests/components/CatalogView.test.ts`

### Implementation for User Story 3

- [X] T029 [US3] Preserve required Loan fields (`book_id`, `member_id`, UTC `issue_date`, calendar-date `due_date`), optional UTC `return_date`, timestamps, and unique partial active-book index in `backend/src/models/loan.model.ts`
- [X] T030 [US3] Implement conditional transactional issue and return updates with sequential session-bound writes and non-negative member counts in `backend/src/services/loan.service.ts`
- [X] T031 [US3] Enforce authenticated issue and return endpoints, CSRF checks, validation, stable errors, and timestamped outcome events in `backend/src/routes/loans.routes.ts`
- [X] T032 [US3] Implement accessible issue and return dialogs with confirmation, eligible-member selection, due-date display, and explicit error/loading states in `frontend/src/App.vue`
- [X] T033 [US3] Ensure updated session-protected loan request/response and error details are documented in `specs/001-book-library-management/contracts/openapi.yaml`

**Checkpoint**: Issue and return are atomic, protected operations available from the
authenticated dashboard.

---

## Phase 6: User Story 4 - Manage Members (Priority: P2)

**Goal**: Let authenticated librarians register, inspect, update, and archive members
while preserving unique email and active-loan constraints.

**Independent Test**: Create and update a member, reject duplicate normalized email,
verify paginated results, and reject archival while a loan is active.

### Tests for User Story 4

- [X] T034 [P] [US4] Add integration coverage for member CRUD, normalized duplicate emails, invalid/missing IDs, pagination, and active-loan archive guard in `backend/tests/integration/library-api.test.ts`
- [X] T035 [P] [US4] Add dashboard component tests for member create/edit forms, validation/errors, pagination, and empty state in `frontend/tests/components/CatalogView.test.ts`

### Implementation for User Story 4

- [X] T036 [US4] Enforce member name as required trimmed non-empty string, valid unique normalized email, non-negative integer active-loan count, creation timestamp, and archive semantics in `backend/src/models/member.model.ts` and `backend/src/services/member.service.ts`
- [X] T037 [US4] Implement authenticated member list/create/read/update/archive handlers with pagination and active-loan guards in `backend/src/routes/members.routes.ts`
- [X] T038 [US4] Implement member create/edit/archive screens with active-loan count, pagination, and actionable errors in `frontend/src/App.vue`

**Checkpoint**: Member operations are available after sign-in and cannot orphan
outstanding loans.

---

## Phase 7: User Story 5 - Find Books (Priority: P2)

**Goal**: Let signed-in librarians search, filter, sort, and paginate the catalog.

**Independent Test**: Search case-insensitively by title/author, combine category and
status filters, verify deterministic sorting/pagination, and see an accessible empty
state when nothing matches.

### Tests for User Story 5

- [X] T039 [P] [US5] Add integration tests for case-insensitive partial matching, combined filters, deterministic sort direction/tie-breaks, pagination, and invalid query values in `backend/tests/integration/library-api.test.ts`
- [X] T040 [P] [US5] Add component tests for authenticated catalog filters, filter retention, sort direction, pagination, empty/error/loading states, and accessibility in `frontend/tests/components/CatalogView.test.ts`

### Implementation for User Story 5

- [X] T041 [US5] Implement authenticated catalog listing with escaped case-insensitive search, category/status filters, default page size 20, maximum 100, stable tie-breaks, and title/creation-date/status-priority sorts in `backend/src/services/book.service.ts` and `backend/src/routes/books.routes.ts`
- [X] T042 [US5] Ensure catalog API client preserves search/filter/sort/direction values across pages and requires the signed-in session in `frontend/src/api/books.ts`
- [X] T043 [US5] Integrate the authenticated catalog dashboard with desktop controls, live result announcements, and retained filters in `frontend/src/App.vue` and `frontend/src/styles.css`

**Checkpoint**: Authenticated librarians can reliably find inventory without exposing
catalog results to signed-out users.

---

## Phase 8: User Story 6 - Track Overdue Loans (Priority: P2)

**Goal**: Let librarians review overdue loans with book/member summaries and complete
the return workflow.

**Independent Test**: Show only outstanding loans due before the library-local current
date; exclude due-today, future, and returned loans; verify empty and return states.

### Tests for User Story 6

- [X] T044 [P] [US6] Add integration coverage for overdue date boundaries, returned-loan exclusion, pagination, missing references, and session authorization in `backend/tests/integration/library-api.test.ts`
- [X] T045 [P] [US6] Add component tests for overdue summaries, empty state, loading/error feedback, and return-dialog handoff in `frontend/tests/components/CatalogView.test.ts`

### Implementation for User Story 6

- [X] T046 [US6] Implement derived loan status and authenticated paginated overdue/history queries with populated book/member summaries in `backend/src/services/loan.service.ts` and `backend/src/routes/loans.routes.ts`
- [X] T047 [US6] Implement the dashboard overdue and loan-history tables with due-date ordering and return action in `frontend/src/App.vue`

**Checkpoint**: Overdue status is derived consistently and returned loans leave the
overdue list.

---

## Phase 9: Development Bootstrap, Sample Data, and Polish

**Purpose**: Complete safe local development setup, accessibility, contract alignment,
and end-to-end quickstart validation.

- [X] T048 [P] Add tests proving the seed command rejects production, SRV/remote hosts, and unapproved database names before any write in `backend/tests/integration/seed-safety.test.ts`
- [X] T049 Implement an explicit idempotent local-only seed command with fictional books and members, insert-only behavior, and refusal of non-local/unapproved database targets in `backend/src/scripts/seed-development.ts`
- [X] T050 Add `.env` loading/configuration instructions and clear local seed/provision warnings without adding usable secrets in `README.md` and `backend/.env.example`
- [X] T051 Add WCAG 2.2 AA checks for sign-in, dashboard navigation, forms, dialogs, tables, keyboard focus, and palette contrast in `frontend/tests/components/accessibility.test.ts` and `frontend/src/styles.css`
- [X] T052 Update health, authentication, startup failure, and event-recording checks to match login-first protected endpoints in `backend/tests/integration/library-api.test.ts` and `backend/tests/integration/startup.test.ts`
- [X] T053 Update runnable local Atlas/development setup, provision, seed, login-first, and transaction workflow checks in `specs/001-book-library-management/quickstart.md`
- [X] T054 Run `npm test`, `npm run typecheck`, `npm run build`, and `npm audit --omit=dev`; record verified outcomes in `specs/001-book-library-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No prerequisite; establishes safe local configuration and commands.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories because it
  enforces authorization and safe startup/configuration.
- **User Stories (Phases 3–8)**: Depend on foundational authorization and runtime setup.
  The login story is the practical prerequisite for all authenticated UI stories.
- **Development Bootstrap, Sample Data, and Polish (Phase 9)**: Core seed implementation
  can proceed after foundational configuration; final validation depends on all desired
  stories.

### User Story Dependencies

- **US1 Sign In / Dashboard (P1)**: Depends on Phase 2; establishes the authenticated
  UI required to exercise later UI stories.
- **US2 Catalog Management (P1)**: Depends on Phase 2 and requires US1 for dashboard
  integration; book API CRUD is independently testable.
- **US3 Issue/Return (P1)**: Depends on book, member, loan models and authenticated
  session foundations; uses US2-created books and US4-created members for the UI journey.
- **US4 Member Management (P2)**: Depends on Phase 2 and US1 for authenticated UI; the
  member API is independently testable.
- **US5 Find Books (P2)**: Depends on protected book routes and US1 for authenticated
  catalog UI; search service behavior can be tested independently.
- **US6 Overdue Loans (P2)**: Depends on US3 loan state transitions and uses its return
  workflow.
- **Development seeding**: Depends on models and development database guards; independent
  of the dashboard implementation and never run automatically.

### Within Each User Story

- Write tests before implementation for each tested behavior.
- Complete schema/data constraints before dependent service behavior.
- Complete services before routes and client integration.
- Complete API behavior before UI integration where tasks share an endpoint.
- Verify each independent test criterion before moving to the next checkpoint.

## Parallel Opportunities

- Setup T001/T002 may be prepared independently from the unit tests in T004; T003 depends
  on the command names agreed by T001–T002.
- In Phase 2, T005 and T007 can proceed in parallel; T006 depends on environment fields
  agreed in T005–T006. Route protection T008 and startup sequencing T009 touch different
  files and can proceed after configuration decisions.
- Within each story, the backend integration tests and frontend component tests marked
  `[P]` target separate files and can be authored in parallel before implementation.
- After Phase 2 and US1, backend and frontend story tasks can be assigned independently
  when their shared API contract is stable.
- T048 seed safety tests can be written alongside T051 accessibility tests; implement
  seed behavior only after its safety tests exist.

## Parallel Example: Login-First Dashboard

```text
1. In parallel: T012 frontend auth/dashboard tests and T013 backend auth integration tests.
2. Then implement T015–T019; API authorization and UI gating both must pass before dashboard use.
3. Verify with the US1 independent test before starting dashboard feature integration.
```

## Implementation Strategy

1. Complete setup and foundational security/startup checks.
2. Deliver US1 first so the application is genuinely login-first.
3. Deliver the P1 catalog and issue/return stories next; add member workflows needed for
   lending, then complete discovery and overdue tracking.
4. Add explicit local provisioning and sample seeding only with fail-closed database
   guards; never run either implicitly from `npm run dev`.
5. Run all validation commands and the quickstart against a safe development database.

**Suggested MVP**: Phase 1, Phase 2, and US1 provide the login-first dashboard shell.
For a usable library MVP, add US2, US3, and US4 so authenticated librarians can create
members/books and issue/return books. US5 and US6 complete discovery and overdue tracking.
