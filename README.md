# Attendance

A student attendance application for teachers: classes with a hard 30-student
capacity, a student register, daily attendance with four statuses, history with
filters and per-student statistics — plus a shared demo account so visitors can
look around without signing up.

Next.js 15 (App Router, server actions) · Drizzle ORM · PostgreSQL · TypeScript.

---

## Quick start

```bash
npm install
cp .env.example .env.local          # then point DATABASE_URL at your database
npm run db:migrate                  # create the schema
npm run db:seed                     # create the shared demo account + sample data
npm run dev                         # http://localhost:3000
```

Demo sign-in: **demo@attendance.app / demo12345** (or the **Try Demo** button on
the login page).

### Configure the database

Any PostgreSQL 13+ instance works. For a throwaway local one:

```bash
docker run -d --name attendance-pg \
  -e POSTGRES_USER=attendance -e POSTGRES_PASSWORD=attendance \
  -e POSTGRES_DB=opus_attendance -p 5432:5432 postgres:16-alpine
```

`.env.local`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `DEMO_EMAIL` / `DEMO_PASSWORD` / `DEMO_NAME` | Shared demo account created by the seeder |
| `APP_TIMEZONE` | Time zone that decides what "today" means (default `Asia/Jakarta`) |
| `SEED_DEMO` | `false` skips demo seeding during the release step |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (`output: standalone`) |
| `npm start` | Serve the built app |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply every unapplied SQL migration |
| `npm run db:seed` | Create/refresh the shared demo account |
| `npm run db:release` | Migrate + seed — what the deployment runs |
| `npm run check:capacity` | Concurrency proof for the 30-student rule (see below) |

Migrations are plain `.sql` files in `drizzle/`, applied in filename order by
`scripts/migrate.mjs` and tracked in a `schema_migrations` table. The runner is
plain Node so it also works inside the deployed standalone bundle. `drizzle-kit`
is configured (`drizzle.config.ts`) for generating future migrations from the
schema.

---

## Data model

```
users ──┬── students ──┐
        │              ├── enrollments ── attendance_records
        └── classes ───┘
```

| Table | Notes |
| --- | --- |
| `users` | `UNIQUE (lower(email))`, scrypt password hash, `is_demo` flag |
| `sessions` | Only the SHA-256 of the cookie token is stored; cascade on user delete |
| `students` | `UNIQUE (owner_id, lower(identifier))` — student IDs are unique per account |
| `classes` | `UNIQUE (owner_id, lower(name))`, owner cascade |
| `enrollments` | `UNIQUE (class_id, student_id)` + `UNIQUE (class_id, seat_no)` + `CHECK (seat_no BETWEEN 1 AND 30)` |
| `attendance_records` | `UNIQUE (class_id, student_id, date)`, composite FK to `enrollments (class_id, student_id)` |

Indexes cover the read paths that matter: classes and students by owner,
enrollments by student, attendance by `(class_id, date)`, `(student_id, date)`
and `date`.

Two structural decisions are worth calling out:

* **`enrollments.seat_no`** turns the capacity rule into a database invariant
  rather than an application check (see below).
* **`attendance_records` references the enrollment pair**, not the two tables
  separately. A record therefore cannot exist for a student who is not in the
  class, and removing a student from a class removes their attendance for that
  class with it.

---

## How the 30-student limit survives concurrency

`lib/services/enrollments.ts` is the only place that creates an enrollment, and
it is used by both the UI (server actions) and the REST API — calling the API
directly runs exactly the same code.

Inside one transaction it:

1. `SELECT ... FOR UPDATE` on the class row. Two simultaneous enrollments into
   the same class are serialised here: the second transaction blocks until the
   first commits, then re-reads the seats. 29 students + two racing requests can
   only ever end at 30.
2. Reads the taken seats, rejects a duplicate student (`409
   duplicate_enrollment`), rejects a full class (`409 class_full`), then claims
   the lowest free seat number.
3. Inserts. If anything ever bypassed step 1 — a direct SQL insert, a future
   code path that forgets the lock — the insert still cannot succeed: seats are
   `UNIQUE (class_id, seat_no)` and constrained to `1..30`, so a 31st row has no
   seat left to claim. The unique/check violations are mapped back to the same
   user-facing errors.

Proof against a running instance:

```bash
npm run build && npm start &
BASE_URL=http://localhost:3000 PARALLEL=6 npm run check:capacity
```

```
Class filled to 29 / 30.
Fired 6 simultaneous enrollments:
  accepted (201): 1
  rejected (409): 5
    · This class has reached the maximum capacity of 30 students.
Final size: 30 / 30
PASS — capacity held at 30 under concurrent enrollment.
```

---

## Authorization

Every service function takes the `ownerId` from the **session**, never from the
request, and every query filters on it — including nested lookups such as
"attendance for class X". A class or student id belonging to another account
resolves to nothing and the caller gets `404`, so the API does not even reveal
whether the record exists. Verified for `GET/PATCH/DELETE /api/classes/:id`,
`/api/students/:id`, enrollment creation and the attendance sheet.

Sessions are httpOnly cookies holding a 256-bit random token; the database only
stores its hash.

---

## Architecture

```
app/(auth)          sign in / register screens
app/(app)           dashboard, classes, students, attendance, settings
app/actions         server actions — parse form data, call a service, return feedback
app/api             REST handlers — parse JSON, call the same service, map errors to status codes
components          presentational pieces (no business logic)
lib/auth            password hashing + session lifecycle
lib/services        business logic and every database query
lib/validation      zod schemas shared by actions and the API
lib/db              Drizzle schema and client
drizzle             SQL migrations
scripts             migrate / seed / release / capacity proof
```

The rule the layering enforces: **UI components never query the database and
never decide business rules**. Both entry points (server actions and REST) are
thin adapters over `lib/services`, so a rule such as the class capacity is
written once and cannot be skipped by the other path. Domain errors
(`lib/errors.ts`) carry a code that the API turns into an HTTP status and the UI
turns into a message.

### REST API

| Method | Path | |
| --- | --- | --- |
| POST | `/api/auth/login` | `{email, password}` or `{demo: true}` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| GET/POST | `/api/classes` | list / create |
| GET/PATCH/DELETE | `/api/classes/:classId` | detail (with members) / update / delete |
| GET/POST | `/api/classes/:classId/enrollments` | members / add student |
| DELETE | `/api/classes/:classId/enrollments/:studentId` | remove student |
| GET/POST | `/api/students` | list (`?search=`) / create |
| GET/PATCH/DELETE | `/api/students/:studentId` | detail (with stats) / update / delete |
| GET/POST | `/api/attendance` | sheet (`?classId=&date=`) / save a day |
| GET | `/api/attendance/history` | filter by `classId`, `studentId`, `status`, `date`, `from`, `to`, `page` |

---

## Demo account

`npm run db:seed` creates `demo@attendance.app` with 52 students and three
classes — Computer Science A (24/30), Mathematics B (**30/30, full**) and
Physics C (14/30) — plus twelve weekdays of attendance, with the most recent day
left open for two classes so there is something to record. Re-running replaces
only the demo account's data. A banner in the app explains that the account is
shared and its data changes.

## UX states

Empty class list, empty student list, empty attendance history, class full
(banner + disabled add form + "Class capacity reached."), duplicate enrollment,
duplicate student ID, validation errors per field, loading state on every submit
button, success messages, 401 (redirect to sign-in), and 404 for anything that
does not belong to the signed-in account.
