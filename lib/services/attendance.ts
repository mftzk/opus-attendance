import "server-only"
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  attendanceRecords,
  classes,
  enrollments,
  students,
  type AttendanceStatus,
} from "@/lib/db/schema"
import { AppError, notFound, validation } from "@/lib/errors"
import { getOwnedClass } from "./classes"
import { toStats, type AttendanceStats } from "./students"
import type { AttendanceFilter, SaveAttendanceInput } from "@/lib/validation/schemas"

export type SheetRow = {
  studentId: string
  identifier: string
  fullName: string
  status: AttendanceStatus | null
  note: string | null
}

export type AttendanceSheet = {
  class: Awaited<ReturnType<typeof getOwnedClass>>
  date: string
  rows: SheetRow[]
  recordedCount: number
}

/** The take-attendance sheet: every enrolled student plus any saved status. */
export async function getAttendanceSheet(
  ownerId: string,
  classId: string,
  date: string,
): Promise<AttendanceSheet> {
  const klass = await getOwnedClass(ownerId, classId)

  const rows = await db
    .select({
      studentId: students.id,
      identifier: students.identifier,
      fullName: students.fullName,
      status: attendanceRecords.status,
      note: attendanceRecords.note,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.classId, enrollments.classId),
        eq(attendanceRecords.studentId, enrollments.studentId),
        eq(attendanceRecords.date, date),
      ),
    )
    .where(eq(enrollments.classId, classId))
    .orderBy(asc(students.fullName))

  return {
    class: klass,
    date,
    rows,
    recordedCount: rows.filter((row) => row.status !== null).length,
  }
}

/**
 * Saves a full day of attendance for a class.
 *
 * One record per (class, student, date) is guaranteed by a unique index, and
 * the upsert updates the existing row instead of inserting a duplicate, so
 * re-saving the same date is safe.
 */
export async function saveAttendance(
  ownerId: string,
  input: SaveAttendanceInput,
): Promise<{ saved: number }> {
  await getOwnedClass(ownerId, input.classId)

  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.classId, input.classId))
  const enrolledIds = new Set(enrolled.map((row) => row.studentId))

  const unknown = input.entries.filter((entry) => !enrolledIds.has(entry.studentId))
  if (unknown.length > 0) {
    throw validation("Attendance can only be recorded for students in this class.")
  }
  if (input.entries.length === 0) throw validation("Nothing to save.")

  const now = new Date()
  await db
    .insert(attendanceRecords)
    .values(
      input.entries.map((entry) => ({
        classId: input.classId,
        studentId: entry.studentId,
        date: input.date,
        status: entry.status,
        note: entry.note,
      })),
    )
    .onConflictDoUpdate({
      target: [attendanceRecords.classId, attendanceRecords.studentId, attendanceRecords.date],
      set: {
        status: sql`excluded.status`,
        note: sql`excluded.note`,
        updatedAt: now,
      },
    })

  return { saved: input.entries.length }
}

export type HistoryRow = {
  id: string
  date: string
  status: AttendanceStatus
  note: string | null
  classId: string
  className: string
  studentId: string
  studentName: string
  studentIdentifier: string
}

export const HISTORY_PAGE_SIZE = 50

export async function listAttendanceHistory(
  ownerId: string,
  filter: AttendanceFilter,
): Promise<{ rows: HistoryRow[]; total: number; page: number; pageSize: number }> {
  const conditions = [eq(classes.ownerId, ownerId)]
  if (filter.classId) conditions.push(eq(attendanceRecords.classId, filter.classId))
  if (filter.studentId) conditions.push(eq(attendanceRecords.studentId, filter.studentId))
  if (filter.status) conditions.push(eq(attendanceRecords.status, filter.status))
  if (filter.date) conditions.push(eq(attendanceRecords.date, filter.date))
  if (filter.from) conditions.push(gte(attendanceRecords.date, filter.from))
  if (filter.to) conditions.push(lte(attendanceRecords.date, filter.to))
  const where = and(...conditions)

  const offset = (filter.page - 1) * HISTORY_PAGE_SIZE

  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: attendanceRecords.id,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        note: attendanceRecords.note,
        classId: classes.id,
        className: classes.name,
        studentId: students.id,
        studentName: students.fullName,
        studentIdentifier: students.identifier,
      })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .innerJoin(students, eq(students.id, attendanceRecords.studentId))
      .where(where)
      .orderBy(desc(attendanceRecords.date), asc(students.fullName))
      .limit(HISTORY_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .where(where),
  ])

  return { rows, total: counted?.total ?? 0, page: filter.page, pageSize: HISTORY_PAGE_SIZE }
}

export async function getHistoryStats(
  ownerId: string,
  filter: AttendanceFilter,
): Promise<AttendanceStats> {
  const conditions = [eq(classes.ownerId, ownerId)]
  if (filter.classId) conditions.push(eq(attendanceRecords.classId, filter.classId))
  if (filter.studentId) conditions.push(eq(attendanceRecords.studentId, filter.studentId))
  if (filter.status) conditions.push(eq(attendanceRecords.status, filter.status))
  if (filter.date) conditions.push(eq(attendanceRecords.date, filter.date))
  if (filter.from) conditions.push(gte(attendanceRecords.date, filter.from))
  if (filter.to) conditions.push(lte(attendanceRecords.date, filter.to))

  const rows = await db
    .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(...conditions))
    .groupBy(attendanceRecords.status)

  return toStats(Object.fromEntries(rows.map((row) => [row.status, row.count])))
}

/** Dates that already have records for a class, newest first. */
export async function listRecordedDates(ownerId: string, classId: string, limit = 14) {
  await getOwnedClass(ownerId, classId)
  return db
    .select({
      date: attendanceRecords.date,
      recorded: sql<number>`count(*)::int`,
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present','late'))::int`,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.classId, classId))
    .groupBy(attendanceRecords.date)
    .orderBy(desc(attendanceRecords.date))
    .limit(limit)
}

export async function deleteAttendanceForDate(ownerId: string, classId: string, date: string) {
  await getOwnedClass(ownerId, classId)
  const deleted = await db
    .delete(attendanceRecords)
    .where(and(eq(attendanceRecords.classId, classId), eq(attendanceRecords.date, date)))
    .returning({ id: attendanceRecords.id })
  if (deleted.length === 0) throw notFound("Attendance for that date")
}

/** Guard used by the REST API when it receives a list of class ids. */
export async function assertOwnedClasses(ownerId: string, classIds: string[]) {
  if (classIds.length === 0) return
  const rows = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.ownerId, ownerId), inArray(classes.id, classIds)))
  if (rows.length !== new Set(classIds).size) throw new AppError("not_found", "Class not found.")
}
