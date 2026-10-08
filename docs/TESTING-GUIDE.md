# Testing guide: TaskFlow Pro (system under test)

This is your **requirements spec**. Treat it the way you would treat a PRD or Confluence page on a real team: design your test cases from these rules, then automate them story by story from the tracker.

The app is finished. **There are no automated tests in this repo. Writing them is your job.**

---

## 1. Environments

| | Local | Deployed (after you follow DEPLOYMENT.md) |
|---|---|---|
| Web app | http://localhost:3000 | `https://<your-app>.vercel.app` |
| API base URL | http://localhost:4000/api/v1 | `https://<your-api>.onrender.com/api/v1` |
| Swagger (try every endpoint) | http://localhost:4000/api/docs | `/api/docs` |
| OpenAPI JSON (import into Postman) | http://localhost:4000/api/docs-json | `/api/docs-json` |

Start locally: `docker compose up -d db` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev` (full steps in README).

**Reset to a clean state at any time:** `pnpm db:reset` wipes the database and re-seeds it. It only works on a local database unless you pass `--yes`.

### Seeded test accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@taskflow.dev | Password@123 |
| MANAGER | manager@taskflow.dev | Password@123 |
| MEMBER | member@taskflow.dev | Password@123 |
| GUEST (read-only) | guest@taskflow.dev | *no password*: use **Continue as guest** on the login page (`POST /auth/guest`) |

Seeded data: projects **WEB** "Website Revamp" (owner: manager; members: manager, member, admin) and **MOB** "Mobile App" (owner: admin; members: admin, member), with 6 tasks between them.

> Good practice: don't build tests that depend on seeded tasks staying unchanged. Create your own data (ideally through the API) and clean it up.

---

## 2. Roles & permissions

| Action | ADMIN | MANAGER | MEMBER | GUEST |
|---|---|---|---|---|
| See all projects | ✅ | only where member | only where member | ✅ **read-only** |
| View boards, tasks, comments, dashboard | ✅ | member projects | member projects | ✅ all |
| Create project | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Edit / archive / delete project | ✅ | only if **owner** | ❌ 403 | ❌ 403 |
| Add / remove project members | ✅ | only if **owner** | ❌ 403 | ❌ 403 |
| Create / edit / move tasks | in projects they can see | member projects | member projects | ❌ 403 |
| Delete task | ✅ | if reporter or project owner | only if **reporter** | ❌ 403 |
| Add comment | ✅ | ✅ | ✅ | ❌ 403 |
| Delete comment | ✅ any | own only | own only | ❌ 403 |
| Edit own profile / password | ✅ | ✅ | ✅ | ❌ 403 |
| List users (for pickers) | ✅ | ✅ | ✅ | ❌ 403 |
| Change role / activate / deactivate users | ✅ (not themselves) | ❌ 403 | ❌ 403 | ❌ 403 |
| View audit log | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| Admin menu items (Users, Audit log) | visible | hidden | hidden | hidden |

Opening a project you are not a member of returns **403 "You are not a member of this project"** (UI shows that message). An unknown id returns **404**, and a malformed id returns **400**.

---

## 3. Business rules (great sources of test cases)

### Authentication
- **Register**: name 2–60 chars; valid email; password 8–64 chars with **upper, lower, number and special character**; email must be unique (409 "Email is already registered"). Email is trimmed and lower-cased. New users are always **MEMBER**.
- **Login**: wrong email or password gives the same message: **401 "Invalid email or password"**. Deactivated users get 401 "Account is deactivated…".
- JWT lifetime is 1 hour. A deactivated user's existing token stops working immediately.
- Change password: wrong current password → 400 "Current password is incorrect"; same as current → 400 "must be different".
- UI: protected pages redirect to `/login?next=<page>` and return there after login. Explicit **logout** goes to plain `/login`. Login page has a show/hide password toggle.

### Guest (read-only) access
- **Continue as guest** on the login page logs in as the shared `guest@taskflow.dev` account with role **GUEST**, with no password (`POST /api/v1/auth/guest`). The guest account cannot log in with a password.
- A guest can **read everything**: every project (not only member ones), boards, task lists, task details, comments and the dashboard, including recent activity across all projects.
- **Every write is blocked by the API**: any `POST`, `PATCH`, `PUT` or `DELETE` by a guest returns **403 "Guest accounts are read-only. Create a free account to make changes."**. This is one global rule, so it also covers endpoints added later. Guests also get 403 on `GET /users` (keeps people's emails private) and `GET /activity`.
- UI for guests: a yellow **"Guest mode"** banner with a **Create a free account** link (logs out and opens Register); no New project / New task / "+" buttons; cards can't be dragged and have no "Move to" dropdown; no Edit/Delete on tasks; status dropdown disabled; no comment box; no Settings tab; profile forms disabled.
- Admins can switch any user to the GUEST role from the Users page to make them read-only. Set `GUEST_LOGIN_ENABLED=false` on the API to turn the guest button off (`POST /auth/guest` → 403).

### Projects
- **Key**: 2–6 letters, stored upper-case, unique (409 "Project key XYZ is already in use"). **Name**: 3–80 chars. Description ≤ 1000.
- Creator becomes **owner** and first **member**.
- **Archived** projects are read-only: no new tasks (400), "New task" button hidden.
- The owner can't be removed from members. Removing a member **unassigns their open tasks** in that project.
- Deleting a project deletes all its tasks and comments.

### Tasks
- **Key** = `<PROJECT KEY>-<n>`, numbered 1, 2, 3… per project.
- Title 3–120 chars (required). Description ≤ 5000. Default status `TODO`, default priority `MEDIUM`.
- Status: `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE` (any order allowed, **but** see next rule).
- ⚠️ **A task must have an assignee before it can move to `IN_REVIEW` or `DONE`** (400). On the Kanban board the card snaps back and an error toast appears.
- Assignee must be a **member of the project** (400).
- Labels: max 10, each ≤ 30 chars; trimmed, lower-cased, duplicates removed (`[" Frontend ", "frontend", "BUG"]` → `["frontend","bug"]`).
- Due date: ISO date. A task is **overdue** when due date < now and status ≠ DONE (shown in red).
- **List / search** (`GET /tasks`): filters `projectId`, `status`, `priority`, `assigneeId` (a UUID or `me`), `label`, `overdue=true`, `search` (matches title, description and key); sort `sortBy` = createdAt | updatedAt | dueDate | priority | number, `sortOrder` = asc | desc; pagination `page` ≥ 1, `limit` 1–100 (default 20).
- UI tasks page keeps filters **in the URL**, so they survive a reload and can be deep-linked. It shows 10 per page.

### Comments
- Body 1–2000 chars, trimmed; whitespace-only is rejected. Ordered oldest first.

### Dashboard
- KPIs: projects, total tasks, my open tasks, overdue, done this week. Counts are scoped to projects you can see.
- Status and priority breakdowns must add up to total tasks.
- "My open tasks" shows up to 5, earliest due first.

### Platform
- Every error has the same JSON shape: `{ statusCode, error, message, path, timestamp }`. `message` is a string or an array of validation messages.
- Unknown request fields are rejected: 400 "property X should not exist".
- Rate limits: 300 requests/min per IP overall and 60/min on login (env `THROTTLE_LIMIT`, `LOGIN_THROTTLE_LIMIT`). Exceeding them returns **429**.
- Security headers via Helmet (`x-content-type-options: nosniff`, no `x-powered-by`).
- `GET /health` is public: `{ status, database, version, uptimeSeconds, responseTimeMs }`.

---

## 4. API endpoints (all under `/api/v1`)

| Method | Path | Auth |
|---|---|---|
| GET | /health | public |
| POST | /auth/register, /auth/login, /auth/guest | public |
| GET / PATCH | /auth/me | any |
| POST | /auth/change-password | any |
| GET | /users, /users/:id | not GUEST |
| PATCH | /users/:id/role, /users/:id/status | ADMIN |
| GET / POST | /projects | any / ADMIN, MANAGER |
| GET / PATCH / DELETE | /projects/:id | member / owner or admin |
| POST / DELETE | /projects/:id/members, /projects/:id/members/:userId | owner or admin |
| GET / POST | /tasks | member of project |
| GET / PATCH / DELETE | /tasks/:id | member / member / reporter, owner or admin |
| PATCH | /tasks/:id/status | member |
| GET / POST | /tasks/:id/comments | member |
| DELETE | /comments/:id | author or admin |
| GET | /dashboard/stats | any |
| GET | /activity | ADMIN |

Auth header: `Authorization: Bearer <accessToken>` (from the login or guest response).

**Guest rule:** every `POST`, `PATCH`, `PUT` and `DELETE` above returns **403** for a GUEST token, whatever the table says.

---

## 5. Locators

Every interactive element has a **`data-testid`** attribute, for example `login-email`, `login-submit`, `project-card`, `task-card`, `column-IN_PROGRESS`, `task-form-modal`. Find them with browser DevTools (Inspect element). Prefer them over CSS classes or XPath. Being able to explain why is a common interview question.

Things that will challenge you (on purpose):
- **Drag and drop** on the Kanban board uses native HTML5 drag events. Some tools handle that well and some don't. Each card also has a "Move to" dropdown as an accessible alternative.
- **Toasts** (top-right) disappear after a few seconds.
- **Optimistic UI**: the board updates instantly, then rolls back if the API rejects the move.
- Login state is a JWT in `localStorage` (key `taskflow.token`), not a cookie.

---

## 6. How we work: story workflow

1. Pick the next story in the **tracker** (`tracker/taskflow-tracker.html`, lowest sprint first). Set it to **In Progress**.
2. Create a branch: `feature/<STORY-KEY>-short-name`, e.g. `feature/PW-104-login-tests`.
3. Put code in the stack's folder:

   | Stack | Folder |
   |---|---|
   | Test plan, test cases, bug reports | `qa/` |
   | Playwright + TypeScript | `tests/playwright-ts/` |
   | Selenium + Java + TestNG (+ RestAssured) | `tests/selenium-java/` |
   | Python (pytest, requests, Selenium/Playwright) | `tests/python/` |
   | Cypress | `tests/cypress/` |
   | Robot Framework | `tests/robot/` |
   | JavaScript: WebdriverIO + Jest/Supertest | `tests/webdriverio/` |
   | Postman / Newman | `tests/postman/` |
   | Tosca (exports + screenshots) | `tests/tosca/` |

4. Make sure the tests **pass locally, twice in a row**.
5. In the tracker: set status **In Review** and fill in **Code location** (folder/files, or a GitHub PR/branch link).
6. Tell Claude in chat: **"Review PW-104"**. Claude reads your code and runs it where possible, then writes the review into the tracker:
   - **Approved** → story moves to **Done**.
   - **Changes requested** → fix the comments and set **In Review** again.
   - Using the offline HTML tracker? Claude gives you a small review JSON snippet. Paste it with **Import** and the review and new status appear on the ticket.

### Definition of Done (every story)
- [ ] Every acceptance criterion is covered by at least one test
- [ ] Tests pass locally twice in a row, and in parallel where the stack supports it
- [ ] No hard-coded sleeps (`Thread.sleep`, `waitForTimeout`, `time.sleep`, `cy.wait(5000)`)
- [ ] Stable locators (`data-testid` first)
- [ ] Each test creates its own data, or resets state, and doesn't depend on other tests
- [ ] Meaningful test names and assertion messages
- [ ] No secrets committed (use env vars / `.env.example`)
- [ ] Short README in the stack folder: how to install and run

### What Claude checks in a review
Correctness against the acceptance criteria · assertion quality · locator strategy · waits and flakiness risks · framework structure and reuse (POM, fixtures, helpers) · test data handling · readability and naming · how it runs in CI · stack-specific best practices.
