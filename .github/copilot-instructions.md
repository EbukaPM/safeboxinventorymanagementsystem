# Copilot Instructions for SafeBox Energy

- This is a full-stack React/Vite + Node/Express + SQLite repo. The root `package.json` orchestrates both sides.
- Key commands:
  - `npm run setup` installs root + client deps and seeds the SQLite database.
  - `npm run dev` starts the backend with `nodemon` and the frontend with Vite concurrently.
  - `npm run build` builds only the React app in `client/`.
  - `npm start` runs `server/index.js` and in production serves `client/dist`.

- Backend structure:
  - `server/index.js` sets up Express, CORS, JSON parsing, static production serving, and central routes.
  - `server/middleware/auth.js` exposes `auth` and `superAdmin` guards based on JWTs and the `users` table.
  - `server/routes/auth.js` handles `/api/auth/*` (login, invite, accept-invite, me, logout).
  - `server/routes/products.js` handles `/api/products` with approval semantics and a separate `/api/products/stock` endpoint.
  - `server/routes/api.js` contains the remaining domain endpoints: movements, returns, projects, materials, engineers, categories, users, settings, audit, dashboard.
  - DB connection is `server/db/index.js` using `better-sqlite3`; `server/db/seed.js` creates `safebox.db` and populates initial data.

- Frontend structure:
  - `client/src/App.jsx` is the router with `PrivateRoute` + `PublicRoute` wrappers and role-based access for Super Admin pages.
  - `client/src/context/AuthContext.jsx` stores auth state, calls `api.get('/auth/me')`, and uses `localStorage` key `sb_token`.
  - `client/src/utils/api.js` always sends `Authorization: Bearer <token>` for authenticated requests and uses base path `/api`.
  - `client/src/pages/Pages.jsx` holds most page components and a shared `useFetch(path)` hook; new pages should follow this pattern.
  - `client/src/components/Layout.jsx` controls sidebar navigation, approval badges, and role-based menu items.

- Project-specific conventions:
  - Auth token lifecycle is front-end managed via `sb_token`; logout removes it and resets `AuthContext` state.
  - API routes are split: auth routes in `/api/auth`, product routes in `/api/products`, all others under `/api`.
  - Many backend entities use prefixed IDs like `PRD-001`, `MV-001`, `PRJ-001`, `CAT-001`, `USR-001`.
  - Most server routes use inline SQL and manual validation, with audit logging via `server/middleware/audit.js` for user actions.
  - Super Admin access is enforced on the backend for: `/api/auth/invite`, `/api/products/:id/approve`, `/api/users`, `/api/categories`, `/api/audit`, and `/api/settings`.

- When editing or adding backend logic:
  - Keep auth checks via `auth` / `superAdmin` in route definitions.
  - Use the existing `nextId` style for prefixed IDs.
  - Add audit calls for user actions so the audit trail remains consistent.

- When editing or adding frontend pages:
  - Use `api.get()`, `api.post()`, and `api.put()` from `client/src/utils/api.js`.
  - Keep UI state in the page module and mirror existing modal/form patterns from `Pages.jsx`.
  - Use `useAuth()` for role gating and `isSA()` checks.

- Important environment details:
  - `JWT_SECRET` is required for auth and is read via `dotenv` on startup.
  - `DB_PATH` defaults to `./server/db/safebox.db` but can be overridden.
  - In development, `CLIENT_URL` defaults to `http://localhost:5173` for CORS.

- Notes:
  - There are no discovered automated tests in the repo.
  - The README is the primary source for deployment and local workflow.
