# Research: Book Library Management System

## Decisions

### Browser authentication and session security

- **Decision**: Use server-side librarian sessions identified by an opaque, host-only
  cookie. Configure `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and a bounded
  lifetime; regenerate the session identifier after successful sign-in and destroy it
  on sign-out. Store sessions in MongoDB rather than Express's in-memory development
  store. Hash passwords with Argon2id. Require a server-validated CSRF token on
  state-changing requests and verify request origin where applicable.
- **Rationale**: A same-origin Vue SPA and Express API can use a browser-native session
  without persisting bearer credentials in JavaScript-accessible storage. Cookie
  authentication requires explicit CSRF protection. API middleware, not frontend
  visibility, enforces librarian access.
- **Alternatives considered**: Browser-stored bearer tokens make cross-origin or
  non-browser clients easier, but expose persistent tokens to JavaScript and therefore
  to successful XSS. A stateless JWT is unnecessary for this single-application,
  librarian-only workflow.
- **References**:
  - [Express session middleware](https://expressjs.com/en/resources/middleware/session.html)
  - [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  - [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
  - [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### MongoDB transaction design

- **Decision**: Use Mongoose's transaction helper for each issue and return operation.
  Include all reads and writes in the same session, make conditional state updates to
  handle concurrency, keep transaction callbacks short, and sequence operations rather
  than running them concurrently. Deploy MongoDB as a replica set (or compatible
  sharded deployment).
- **Rationale**: The workflow spans a book, loan, and member document; one transaction
  prevents partially applied changes. Conditional updates are required in addition to
  transactions to ensure concurrent attempts cannot both issue or return the same item.
- **Alternatives considered**: Separate writes with compensating rollback can leave
  inconsistent data on process failure. A standalone MongoDB deployment cannot provide
  the required multi-document transactions.
- **References**:
  - [MongoDB Node.js driver transactions](https://www.mongodb.com/docs/drivers/node/current/crud/transactions/)
  - [MongoDB transaction production considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
  - [Mongoose transactions](https://mongoosejs.com/docs/transactions.html)

### Test boundaries

- **Decision**: Exercise backend behavior through Jest/Supertest against an isolated
  transaction-capable MongoDB test deployment. Exercise Vue components with Vitest and
  Vue Test Utils, stubbing the API boundary.
- **Rationale**: HTTP-level backend tests verify authorization, validation, error
  handling, and persisted multi-document invariants; component tests verify user-facing
  states and interaction without duplicating server tests.
- **Alternatives considered**: Frontend component tests alone cannot establish
  transaction safety or cookie/CSRF behavior. Jest is not the natural test runner for a
  Vite frontend; Vitest uses the Vite ecosystem.
- **References**:
  - [Jest documentation](https://jestjs.io/docs/getting-started)
  - [Supertest](https://github.com/forwardemail/supertest#readme)
  - [Vitest guide](https://vitest.dev/guide/)
  - [Vue Test Utils guide](https://test-utils.vuejs.org/guide/)
  - [Jest and Vite](https://jestjs.io/docs/getting-started#using-with-vite)

## Implementation Assumptions

- Serve the SPA and `/api` under one origin in production where practical; if separate
  origins are required, allow only the configured frontend origin and credentials.
- Configure librarian accounts through a controlled, non-public provisioning path.
- The test environment must support MongoDB replica-set transactions.
- No formal uptime, backup, or recovery objective is introduced by this design.

## Follow-up Planning Decisions (2026-11-07)

### Local development librarian credentials

- **Decision**: Configure `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` only in the
  ignored `backend/.env`; keep non-usable placeholders in `.env.example`. Do not add a
  fallback password in source or put credentials in any `VITE_` variable. Use the
  existing Argon2id password hashing and a controlled, explicit provisioning command.
- **Rationale**: This supports a convenient local login without committing reusable
  credentials or exposing them in the browser bundle. Deployment secrets must be
  injected through the deployment's secret-management mechanism.
- **Alternatives considered**: A shared committed default password or code fallback is
  easier to reuse accidentally and is rejected. Public registration is not required.
- **References**: [Vite environment variables](https://vite.dev/guide/env-and-mode#env-variables);
  [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html);
  [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Provisioning and development data safety

- **Decision**: Keep librarian provisioning and sample-data seeding as explicit
  development commands, not server startup or install/build hooks. Bootstrap is allowed
  only when `NODE_ENV=development`, targets a local MongoDB database, and succeeds as a
  no-op if the configured account already exists; it never replaces the existing
  password. Add an idempotent seed command with fictional records and insert-only
  behavior. Reject production mode, remote/SRV hosts, and unexpected database names
  before writes.
- **Rationale**: The checked-in `npm run dev` uses a URI from `.env`, which may point to
  Atlas. Automatically seeding on startup could mutate a remote database. The current
  provision script is explicit but does not yet reject remote targets or treat an
  existing user as a successful no-op; there is no seed command yet.
- **Alternatives considered**: Startup seeding and drop/reinsert strategies are rejected
  because they can write to the wrong database or destroy local work. Tests continue to
  use isolated test fixtures, not the developer seed script.
- **References**: MongoDB [upsert/updateOne](https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/)
  and [unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/);
  [npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts).

### Login-first application and API authorization

- **Decision**: On startup, show a loading state while checking `/auth/session`; render
  only sign-in while unauthenticated and do not request catalog/member/loan data. After
  login, show the dashboard; logout clears app state and returns to sign-in. Require a
  librarian session for every catalog, member, and loan read/write endpoint. Keep only
  session/authentication bootstrap, CSRF-token bootstrap, and health endpoints public.
  Preserve CSRF validation for state-changing requests.
- **Rationale**: The follow-up explicitly replaces public catalog browsing. The current
  SPA displays catalog while signed out and calls its initial data load after session
  check regardless of authentication. Current book GET endpoints are also public even
  though member/loan routers are protected. API-side authorization is required; UI
  visibility alone is not an access control.
- **Alternatives considered**: Retaining a public catalog conflicts with the confirmed
  sign-in-first flow. A client-side router guard may improve navigation but cannot
  replace backend authorization.
- **References**: [Vue Router navigation guards](https://router.vuejs.org/guide/advanced/navigation-guards.html);
  [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html);
  [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html);
  [Express session middleware](https://expressjs.com/en/resources/middleware/session.html).

### MongoDB connection during development startup

- **Decision**: Keep the backend startup sequence as environment validation, MongoDB
  connection, transaction-topology verification, and only then API listen. The root
  `npm run dev` starts the API and frontend concurrently; readiness is determined by
  the API health endpoint, not by whether Vite has started.
- **Rationale**: This is the existing server behavior and was verified with the
  configured database: the API listened only after connecting, and `/api/health`
  returned `200`. The backend visibly fails startup if MongoDB is unreachable or lacks
  transaction-capable topology.
- **Alternatives considered**: Starting the API before MongoDB or presenting a healthy
  state while persistence is unavailable would misrepresent readiness and violate the
  transactional data-integrity requirement.
