# Book Library Management System

Vue/Vite desktop SPA and Express/MongoDB API for a single-branch library.

## Requirements

- Node.js LTS and npm
- MongoDB running as a replica set (multi-document transactions are required)
- A valid IANA `LIBRARY_TIME_ZONE`
- A long random `SESSION_SECRET`

## Local MongoDB setup (macOS)

The issue/return workflows require MongoDB replica-set transactions. To run a local
development database with Homebrew:

1. Install MongoDB if it is not already installed:
   ```sh
   brew tap mongodb/brew
   brew install mongodb-community@8.0
   ```
2. Open the MongoDB configuration:
   ```sh
   nano "$(brew --prefix)/etc/mongod.conf"
   ```
   Add this top-level setting, without duplicating an existing `replication` section:
   ```yaml
   replication:
     replSetName: rs0
   ```
3. Start or restart the service:
   ```sh
   brew services restart mongodb-community@8.0
   ```
   If this is the first install, `brew services start mongodb-community@8.0` also works.
4. Initialize the replica set once:
   ```sh
   mongosh "mongodb://127.0.0.1:27017/admin"
   ```
   In the MongoDB shell, run:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [{ _id: 0, host: "127.0.0.1:27017" }]
   })
   ```
   Then run `rs.status()` and wait for the member to become `PRIMARY`. Do not repeat
   `rs.initiate()` if the replica set is already initialized.

## Development

1. Copy `backend/.env.example` to `backend/.env` if needed. Set a random
   `SESSION_SECRET` of at least 32 characters, a valid IANA `LIBRARY_TIME_ZONE`,
   `NODE_ENV=development`, and your local database URI:
   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/library?replicaSet=rs0
   ```
2. Set `LIBRARIAN_EMAIL` and a unique, strong `LIBRARIAN_PASSWORD` of at least 12
   characters in `backend/.env`. Example values are placeholders, not login credentials.
   Keep this file private and untracked; never commit `.env` files.
3. Install dependencies and provision the librarian:
   ```sh
   npm install
   npm run provision:librarian
   ```
   Provisioning only accepts an allowlisted local development database and never
   overwrites an existing account. If the account already exists, changing the env
   password does not change its stored password.
4. Optionally add fictional books and members:
   ```sh
   npm run seed:dev
   ```
   Seeding is explicit and idempotent. It refuses production, remote/SRV hosts, and
   database names outside the local allowlist. It is not run by `npm run dev`.
5. Start the app:
   ```sh
   npm run dev
   ```
   Vite serves the frontend on port 5173 and the API on port 3000. The backend loads
   `backend/.env`, connects to MongoDB, verifies transaction support, then starts
   listening. If `npm run dev` was already running when you changed `MONGODB_URI`,
   stop it with Ctrl+C and restart it so the API reconnects using the new setting.
6. Open the frontend and sign in with the email and password configured in
   `backend/.env`. The login screen appears before the librarian dashboard.

The development provision and seed commands intentionally refuse remote Atlas
databases. Do not weaken these checks to create or seed an account in a remote database;
remote accounts must be provisioned through an authorized deployment process.
Public librarian registration is not available.

Run `npm test`, `npm run typecheck`, and `npm run build` for checks.

API and feature design documentation is in `specs/001-book-library-management/`.
