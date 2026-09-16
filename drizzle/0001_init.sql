-- Core schema for the attendance application.
--
-- Design notes
--   * Every tenant-owned row carries `owner_id` so authorization can always be
--     expressed as a predicate on the query instead of an application check.
--   * `enrollments.seat_no` is the capacity guard: a class owns seats 1..30
--     and a seat can be taken once, so the database itself can never hold a
--     31st member of a class.
--   * `attendance_records` references the enrollment pair, so a record can
--     only exist for a student who is actually in the class, and removing the
--     enrollment removes the attendance with it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,
  is_demo       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Only the SHA-256 of the cookie token is stored, so a database leak does
  -- not hand out live sessions.
  token_hash text NOT NULL,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions (token_hash);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  identifier text NOT NULL,
  full_name  text NOT NULL,
  email      text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_identifier_not_blank CHECK (length(btrim(identifier)) > 0),
  CONSTRAINT students_full_name_not_blank CHECK (length(btrim(full_name)) > 0)
);
-- Student identifiers are unique per account, case-insensitively.
CREATE UNIQUE INDEX students_owner_identifier_unique ON students (owner_id, lower(identifier));
CREATE INDEX students_owner_name_idx ON students (owner_id, full_name);

CREATE TABLE classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classes_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX classes_owner_name_unique ON classes (owner_id, lower(name));
CREATE INDEX classes_owner_created_idx ON classes (owner_id, created_at DESC);

CREATE TABLE enrollments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  seat_no    integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_seat_range CHECK (seat_no BETWEEN 1 AND 30)
);
-- A student joins a class at most once ...
CREATE UNIQUE INDEX enrollments_class_student_unique ON enrollments (class_id, student_id);
-- ... and each of the 30 seats of a class is handed out at most once.
CREATE UNIQUE INDEX enrollments_class_seat_unique ON enrollments (class_id, seat_no);
CREATE INDEX enrollments_student_idx ON enrollments (student_id);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE attendance_records (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL,
  student_id uuid NOT NULL,
  date       date NOT NULL,
  status     attendance_status NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Attendance can only exist for a student enrolled in that class; dropping
  -- the enrollment drops the attendance history with it.
  CONSTRAINT attendance_enrollment_fk FOREIGN KEY (class_id, student_id)
    REFERENCES enrollments (class_id, student_id) ON DELETE CASCADE
);
-- One record per student per class per day; saving again updates it.
CREATE UNIQUE INDEX attendance_class_student_date_unique
  ON attendance_records (class_id, student_id, date);
CREATE INDEX attendance_class_date_idx ON attendance_records (class_id, date DESC);
CREATE INDEX attendance_student_date_idx ON attendance_records (student_id, date DESC);
CREATE INDEX attendance_date_idx ON attendance_records (date DESC);
