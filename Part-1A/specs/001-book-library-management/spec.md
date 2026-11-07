# Feature Specification: Book Library Management System

**Feature Branch**: `001-book-library-management`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Build a single-branch book library management system for librarians, supporting book and member management, search and filtering, atomic issue and return workflows, and overdue tracking. Email notifications are deferred."

## Clarifications

### Session 2026-11-07

- Q: Who should be allowed to manage books, members, and loans in the system? → A: Public catalog browsing; signed-in librarians manage books, members, and loans.
- Q: What accessibility standard should the library interface meet at launch? → A: Meet WCAG 2.2 Level AA across the library interface.
- Q: What monthly availability target should the library service meet? → A: Best effort; no formal availability target.
- Q: If the library's stored data is lost or corrupted, what recovery objective should the release meet? → A: No defined backup or recovery objective for this release.
- Q: What operational information should be recorded to help diagnose problems with the library service? → A: Record errors and key events; provide a basic service health check.
- Q: Should mobile layouts be included in this release? → A: No; mobile view is out of scope.

### Session 2026-11-07 (follow-up)

- Q: Should users be able to browse the catalog before signing in? → A: No. Show the sign-in screen first; after authentication, show the librarian dashboard and catalog.
- Q: How should default librarian credentials be supplied? → A: Store local-development credentials in the ignored backend `.env` file and provision them through a controlled setup command; do not commit real credentials or permit weak defaults in production.
- Q: How should sample data be added? → A: Provide an explicit, idempotent seed command limited to a local development database; never seed remote or production databases automatically.

## User Scenarios & Testing *(mandatory)*

### User Story 0 - Sign In to the Librarian Dashboard (Priority: P1)

A librarian signs in before viewing the dashboard. The application opens on the login
screen when no authenticated session exists and reveals the catalog and management
workflows only after successful authentication.

**Independent Test**: Open the application without a session and confirm that only the
login experience is available; sign in with a provisioned librarian, verify dashboard
access, then sign out and verify the login screen returns.

**Acceptance Scenarios**:

1. **Given** there is no authenticated session, **When** a user opens the application,
   **Then** the login screen is shown and dashboard/catalog data is not displayed.
2. **Given** valid librarian credentials, **When** sign-in succeeds, **Then** the
   librarian dashboard and catalog are displayed.
3. **Given** invalid credentials, **When** sign-in fails, **Then** the user remains on
   the login screen and sees a safe error message.
4. **Given** a signed-in librarian, **When** they sign out, **Then** the session is
   invalidated and the login screen is shown.

---

### User Story 1 - Issue and Return Books (Priority: P1)

A librarian issues an available book to an eligible member, sees the due date, and later
records the return. Inventory, loan history, and the member's active-loan count remain
consistent throughout the workflow.

**Why this priority**: Safe lending and return are the central library operations and
depend on accurate inventory and loan records.

**Independent Test**: Issue an available book to a registered member, verify the loan and
due date, then return it and verify the book is available and the member's active-loan
count is reduced.

**Acceptance Scenarios**:

1. **Given** an available book and a registered member, **When** a librarian issues the
   book, **Then** one active loan with a due date is recorded, the book becomes issued,
   and the member's active-loan count increases by one.
2. **Given** a book that is issued or under maintenance, **When** a librarian attempts to
   issue it, **Then** the issue is rejected with a clear explanation and no loan or count
   changes.
3. **Given** an active or overdue loan, **When** a librarian records its return, **Then**
   the loan is marked returned with its return date, the book becomes available, and the
   member's active-loan count decreases by one.
4. **Given** an already returned loan, **When** a librarian attempts to return it again,
   **Then** the operation is rejected without changing inventory or member counts.
5. **Given** concurrent attempts to issue the same available book, **When** both are
   processed, **Then** at most one issue succeeds and all recorded counts and loan states
   reflect only successful operations.

---

### User Story 2 - Manage the Catalog (Priority: P1)

A librarian creates, views, updates, and removes book records so the catalog accurately
reflects the inventory.

**Why this priority**: Lending workflows rely on correct, searchable book records.

**Independent Test**: Create a book, find it in the catalog, update its details, and
remove it when it has no active loan.

**Acceptance Scenarios**:

1. **Given** valid book details, **When** a librarian saves a new book, **Then** the book
   appears in the catalog with an available status.
2. **Given** an ISBN already in use, **When** a librarian creates or changes a book to
   that ISBN, **Then** the change is rejected with a clear explanation and the existing
   record remains unchanged.
3. **Given** a book without an active loan, **When** a librarian updates or deletes it,
   **Then** the catalog reflects the successful change; a deleted book is archived,
   removed from the active catalog, and available in the Archived books view.
4. **Given** a book with an active loan, **When** a librarian attempts to delete it,
   **Then** deletion is rejected and the loan and book remain intact.
5. **Given** a book record, **When** a librarian changes its status to maintenance,
   **Then** it cannot be issued until it is returned to available status.
6. **Given** an archived book, **When** a librarian opens Archived books and restores it,
   **Then** it returns to the active catalog with its loan history and status preserved.

---

### User Story 3 - Manage Members (Priority: P2)

A librarian registers, views, updates, and removes member records to keep borrowing
eligibility and loan ownership accurate.

**Why this priority**: Member records are required to associate loans with borrowers.

**Independent Test**: Register a member, find and update the member profile, and remove
the member when there are no active loans.

**Acceptance Scenarios**:

1. **Given** a unique, valid email and member name, **When** a librarian registers a
   member, **Then** the member is available for lending.
2. **Given** an email already assigned to another member, **When** a librarian attempts
   to register or update a member with that email, **Then** the change is rejected and
   the existing member record remains unchanged.
3. **Given** a member with no active loans, **When** a librarian updates or deletes the
   member, **Then** the member list reflects the successful change; a deleted member is
   archived, removed from the active list, and available in the Archived members view.
4. **Given** a member with an active loan, **When** a librarian attempts to delete that
   member, **Then** deletion is rejected and the loan remains associated with the member.
5. **Given** an archived member, **When** a librarian opens Archived members and restores
   the member, **Then** it returns to the active member list with its loan history and
   active-loan count preserved.

---

### User Story 4 - Find Books (Priority: P2)

A signed-in librarian searches by book title or author and narrows results by category
and availability to find relevant books.

**Why this priority**: Effective discovery makes the inventory useful to librarians.

**Independent Test**: Search a catalog containing matching and nonmatching books, apply
category and status filters, and verify that only matching records appear.

**Acceptance Scenarios**:

1. **Given** books with different titles and authors, **When** a user searches by text,
   **Then** books whose title or author contains the search text are shown without
   regard to letter case.
2. **Given** books in multiple categories and statuses, **When** a user selects category
   and availability filters, **Then** only books matching all selected filters are
   shown.
3. **Given** no books match the current search and filters, **When** results are shown,
   **Then** the user sees a helpful empty state and can change or clear the criteria.
4. **Given** a result list sorted by title or creation date, **When** books share the
   same primary sort value, **Then** their relative ordering remains deterministic.
5. **Given** a catalog larger than one results page, **When** a user moves between
   pages, **Then** the selected search, filters, and sort order are retained.
6. **Given** a user navigating the library without a mouse or using assistive
   technology, **When** they use catalog and lending workflows, **Then** the interface
   supports those workflows in accordance with WCAG 2.2 Level AA.

---

### User Story 5 - Track Overdue Loans (Priority: P2)

A librarian identifies loans whose due dates have passed and can process their return
through the normal return workflow.

**Why this priority**: Clear overdue visibility helps librarians follow up and maintain
accurate lending records.

**Independent Test**: Compare active loan due dates with the current date and verify that
only past-due, unreturned loans appear as overdue.

**Acceptance Scenarios**:

1. **Given** an unreturned loan whose due date is before the current date, **When** a
   librarian views overdue loans, **Then** the loan is identified as overdue and its
   book and member are shown.
2. **Given** a loan due today or in the future, **When** a librarian views overdue loans,
   **Then** the loan is not listed as overdue.
3. **Given** there are no overdue loans, **When** a librarian views overdue loans,
   **Then** a helpful empty state is shown.
4. **Given** an overdue loan, **When** the librarian records its return, **Then** it is
   no longer listed as overdue and its return is recorded.

### Edge Cases

- Two librarians attempt to issue the same available book at nearly the same time.
- A book or member is deleted while associated with an active loan.
- A loan is returned more than once, or an issue is attempted for a book already issued
  or under maintenance.
- An ISBN or email differs only by letter case or surrounding whitespace.
- A search has no matches, a filter combination has no matches, or the catalog has no
  records.
- A loan is due today, becomes overdue after its due date, or is returned after becoming
  overdue.
- A list contains more records than fit on one page, or multiple records have the same
  primary sort value.
- A required field is missing or malformed, or a requested book, member, or loan does
  not exist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow librarians to create, view individual, list, update,
  and delete book records containing title, author, unique ISBN, category, status,
  creation date, and update date.
- **FR-002**: The system MUST allow librarians to create, view individual, list, update,
  and delete member records containing name, unique email, and active-loan count.
- **FR-003**: The system MUST allow librarians to view individual loans and lists of
  loans, including active, returned, and overdue records.
- **FR-004**: The system MUST reject missing or invalid required values, unsupported
  statuses, duplicate ISBNs, and duplicate member emails with a descriptive error.
- **FR-005**: The system MUST allow a librarian to issue a book only when its status is
  available and the selected member exists and is eligible to borrow.
- **FR-006**: A successful issue MUST create exactly one active loan with issue and due
  dates, change the book status to issued, and increment the member's active-loan count
  as one indivisible operation.
- **FR-007**: A failed issue MUST leave the book, member count, and loan history
  unchanged. Attempts to issue an issued or maintenance book MUST be rejected as a
  client error.
- **FR-008**: The system MUST allow an active or overdue loan to be returned exactly
  once. A successful return MUST record the return date, mark the loan returned, change
  the book status to available, and decrement the member's active-loan count as one
  indivisible operation.
- **FR-009**: The system MUST reject invalid state transitions and prevent deletion of a
  book or member with an active loan.
- **FR-010**: The system MUST identify unreturned loans past their due date as overdue
  and remove returned loans from overdue results.
- **FR-011**: The system MUST allow signed-in librarians to search book titles and
  authors with case-insensitive partial text matching.
- **FR-012**: The system MUST allow users to filter books by category and status,
  including available, issued, and maintenance; when multiple filters are selected,
  results MUST satisfy all selected filters.
- **FR-013**: The system MUST support paginated book and member lists and deterministic
  book sorting by title, creation date, or status priority, retaining the selected
  criteria while navigating pages.
- **FR-014**: The system MUST present understandable empty states for catalogs, search
  results, and active or overdue loan lists with no records.
- **FR-015**: The system MUST provide clear error messages for invalid input, missing
  records, duplicate values, and unsuccessful lending operations; failed operations
  MUST NOT appear successful to the user.
- **FR-016**: The system MUST provide catalog tables, forms, and issue/return dialogs
  that remain usable at desktop screen sizes. Mobile-specific layouts and mobile
  viewport support are out of scope for this release.
- **FR-017**: The system MUST provide a user interface for book and member management,
  catalog search and filtering, loan issue and return, and overdue review.
- **FR-018**: The system MUST show a librarian sign-in screen before exposing the
  dashboard or catalog. It MUST require a signed-in librarian for catalog, member, and
  loan reads and for all book, member, and loan mutations.
- **FR-019**: The system MUST conform to WCAG 2.2 Level AA across the library interface.
- **FR-020**: The system MUST record application errors, sign-in outcomes, and book
  issue and return outcomes in operational records, and MUST provide a basic service
  health check.
- **FR-021**: The system MUST support a local-development librarian account configured
  by `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` in the ignored backend `.env` file and
  provisioned through a controlled, idempotent command. Real credentials MUST NOT be
  committed, and the development bootstrap MUST be disabled in production.
- **FR-022**: The system MUST provide an explicit, repeatable sample-data seed command
  for local development. The command MUST refuse production mode and non-local MongoDB
  hosts or unapproved database names, avoid duplicate sample records, and MUST NOT run
  automatically against a remote database.
- **FR-023**: Deleting a book or member MUST archive it rather than permanently remove
  the record, preserving its identifier and loan history. The librarian interface MUST
  provide clearly accessible Archived books and Archived members views, separate from
  the active catalog and member list, and a restore action for archived records.
  Restoring MUST return a record to its active list without changing its book status,
  member loan count, or loan history. Deletion of a record with an active loan MUST
  remain rejected.

### Key Entities *(include if feature involves data)*

- **Book**: A catalog item described by title, author, unique ISBN, category, status
  (available, issued, or maintenance), and creation and update dates.
- **Member**: A borrower profile with name, unique email, and the number of active loans.
- **Loan**: A record connecting one book and one member, with issue date, due date,
  optional return date, and status (active, overdue, or returned).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all successful issue and return operations, book status, loan status,
  and member active-loan count agree; in failed or concurrent duplicate issue attempts,
  no more than one active loan is created for the same book.
- **SC-002**: 100% of attempts to issue a book marked issued or maintenance are rejected
  without changing its loan history or the member's loan count.
- **SC-003**: In a representative catalog of 10,000 books, at least 95% of searches and
  filter changes display the matching first page within 2 seconds.
- **SC-004**: At a 1280-pixel-wide desktop viewport, users can complete book search,
  book entry, and issue/return workflows without clipped controls or horizontal page
  scrolling.
- **SC-005**: At least 9 out of 10 representative librarians can complete a book search,
  an issue, and a return without assistance during usability testing.
- **SC-006**: Every loan past its due date and not yet returned is identifiable in the
  overdue view; loans due today or later and returned loans are not identified as
  overdue.
- **SC-007**: All user-facing workflows meet WCAG 2.2 Level AA when evaluated against
  the standard's applicable success criteria.
- **SC-008**: Operators can determine the timestamp and outcome of each sign-in and
  book issue or return attempt from operational records, and can retrieve a basic
  service health status.
- **SC-009**: With no authenticated session, the application shows only the sign-in
  screen; after successful sign-in, the dashboard is available, and after sign-out it is
  no longer available.
- **SC-010**: The development seed command can be run repeatedly without creating
  duplicate sample records and refuses a production, non-local, or unapproved database
  target.
- **SC-011**: Every archived book and member can be found in its corresponding
  librarian-only Archived view and restored to the active list with its identifier,
  loan history, and other domain state preserved.

## Assumptions

- The system serves one library branch; book entry is manual, with no external barcode
  scanner integration in this release.
- The user interface targets desktop screen sizes; mobile-specific layouts and mobile
  viewport support are excluded from this release.
- Due dates are calculated as 14 calendar days after issue, using the library's local
  date. The due-date period is a default policy for the initial release.
- Registered members are eligible to borrow; no separate account suspension workflow
  is included.
- No configurable per-member loan limit is introduced in this release.
- Books and members with active loans cannot be deleted; librarians must complete the
  return workflow first.
- Overdue status is determined from the due date and current date. Fine calculation is
  excluded.
- All application workflows are behind librarian sign-in. Librarian accounts are
  managed through controlled provisioning, not public registration.
- Local-development account credentials are supplied in the ignored `backend/.env`;
  example environment files contain placeholders only.
- Development sample records are inserted only by an explicit local-database seed
  command and are never automatically applied to the configured remote database.
- Service availability is best effort; this release has no formal monthly availability
  target.
- This release has no formal backup, data-loss, or recovery-time objective.
- This release requires no threshold-based metrics or automated operational alerts.
- Automated due-date email notifications are deferred to a future release.
- Search is case-insensitive partial matching. Pagination uses a default page size of
  20 and a maximum page size of 100.
- Duplicate ISBN and email comparisons ignore surrounding whitespace and letter case.
