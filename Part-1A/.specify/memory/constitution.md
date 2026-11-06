<!--
Sync Impact Report
Version change: unratified template → 1.0.0
Modified principles:
- Principle 1 placeholder → Domain State Integrity
- Principle 2 placeholder → Contract-First Full-Stack Design
- Principle 3 placeholder → Validated Data and Safe Operations
- Principle 4 placeholder → Automated Verification
- Principle 5 placeholder → Predictable, Usable Workflows
Added sections: Technology & Data Constraints; Development Workflow & Quality Gates
Removed sections: None
Follow-up TODOs:
- Confirm the original ratification date.
- Product implementation requirements are deferred to /speckit-specify.
-->
# Book Library Management System Constitution

## Core Principles

### I. Domain State Integrity
Book, member, and loan data MUST preserve the defined domain invariants. Issuing and
returning a book MUST update every affected record as one atomic operation, preventing
duplicate active loans and inconsistent book availability or member loan counts. State
transitions MUST be explicit and invalid transitions MUST be rejected. This protects the
library inventory from concurrent or partial updates.

### II. Contract-First Full-Stack Design
The Vue.js application MUST interact with the library through documented Express REST
contracts; it MUST NOT bypass the API to mutate persisted data. API inputs and outputs
MUST use consistent resource fields, validation errors, and HTTP status codes. Keeping
the boundary explicit allows the client and server to evolve and be tested independently.

### III. Validated Data and Safe Operations
Persisted data MUST be validated at the server and schema boundaries, including required
fields, enumerated states, and uniqueness constraints. User-provided values MUST be
validated before persistence; client-side validation complements but never replaces
server-side validation. Errors MUST be reported with appropriate status codes rather than
being represented as successful operations.

### IV. Automated Verification
Changes MUST include automated tests proportionate to their behavior. Tests MUST cover
critical state transitions, issue/return limits, transactional behavior, API validation,
and relevant frontend form validation. Integration tests MUST exercise persistence and
multi-record workflows so guarantees are verified at the boundary where failures can occur.

### V. Predictable, Usable Workflows
Book listing, filtering, and sorting MUST produce deterministic results, including a stable
tie-breaker when primary sort values match. Paginated operations MUST expose enough
information for clients to navigate results. The interface MUST provide clear inventory
and member workflows, actionable validation feedback, and understandable issue/return
actions. Predictability supports reliable use as the catalog grows.

## Technology & Data Constraints

The application MUST use a Vue.js single-page frontend, a Node.js/Express REST API, and
MongoDB persistence through Mongoose models. The API MUST provide book, member, and loan
resources. Book and member identifiers MUST be database-generated ObjectIds; loan records
MUST reference their book and member. Database transactions MUST be used for workflows
that change multiple documents together, and the deployment environment MUST support
MongoDB transactions. Unique identifiers such as ISBN and member email MUST be enforced
by the database as well as validated at the API boundary.

## Development Workflow & Quality Gates

Implementation plans and reviews MUST demonstrate how each change preserves these
principles. Changes to domain state or API contracts MUST include corresponding backend
tests; changes to interactive forms MUST include validation coverage. Before completion,
the relevant automated tests MUST pass, and directly related documentation MUST be
updated. Any exception to a MUST requirement requires explicit maintainer approval and
a documented rationale and scope.

## Governance

This constitution takes precedence over conflicting project practices. Amendments MUST be
reviewed and approved by the project maintainer, update this document, and include a
version and amendment-date update. Versioning follows Semantic Versioning: MAJOR for
backward-incompatible governance changes, MINOR for new principles or materially expanded
requirements, and PATCH for clarifications and non-semantic refinements. Feature plans,
implementation reviews, and relevant tests MUST be checked for compliance; deviations
require an approved, documented exception. The original adoption date remains unknown
and MUST be confirmed before this constitution is treated as formally ratified.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-11-06
