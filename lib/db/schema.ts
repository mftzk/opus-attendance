import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

/** A class can never hold more than this many students. */
export const CLASS_CAPACITY = 30

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
])

export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number]

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(sql`lower(${table.email})`)],
)

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
)

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    identifier: text("identifier").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("students_owner_identifier_unique").on(
      table.ownerId,
      sql`lower(${table.identifier})`,
    ),
    index("students_owner_name_idx").on(table.ownerId, table.fullName),
    check("students_identifier_not_blank", sql`length(btrim(${table.identifier})) > 0`),
    check("students_full_name_not_blank", sql`length(btrim(${table.fullName})) > 0`),
  ],
)

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("classes_owner_name_unique").on(table.ownerId, sql`lower(${table.name})`),
    index("classes_owner_created_idx").on(table.ownerId, table.createdAt),
    check("classes_name_not_blank", sql`length(btrim(${table.name})) > 0`),
  ],
)

/**
 * Class membership. `seatNo` is what makes the capacity rule a database
 * invariant: a class owns seats 1..30 and each seat is unique per class, so
 * no amount of concurrency can produce a 31st member.
 */
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    seatNo: integer("seat_no").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("enrollments_class_student_unique").on(table.classId, table.studentId),
    uniqueIndex("enrollments_class_seat_unique").on(table.classId, table.seatNo),
    index("enrollments_student_idx").on(table.studentId),
    check("enrollments_seat_range", sql`${table.seatNo} between 1 and ${sql.raw(String(CLASS_CAPACITY))}`),
  ],
)

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id").notNull(),
    studentId: uuid("student_id").notNull(),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_class_student_date_unique").on(
      table.classId,
      table.studentId,
      table.date,
    ),
    index("attendance_class_date_idx").on(table.classId, table.date),
    index("attendance_student_date_idx").on(table.studentId, table.date),
    index("attendance_date_idx").on(table.date),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  students: many(students),
  classes: many(classes),
  sessions: many(sessions),
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  owner: one(users, { fields: [classes.ownerId], references: [users.id] }),
  enrollments: many(enrollments),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  owner: one(users, { fields: [students.ownerId], references: [users.id] }),
  enrollments: many(enrollments),
}))

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  class: one(classes, { fields: [enrollments.classId], references: [classes.id] }),
  student: one(students, { fields: [enrollments.studentId], references: [students.id] }),
}))

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  class: one(classes, { fields: [attendanceRecords.classId], references: [classes.id] }),
  student: one(students, { fields: [attendanceRecords.studentId], references: [students.id] }),
}))
