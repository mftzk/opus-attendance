import "server-only"
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { attendanceRecords, classes, enrollments, students } from "@/lib/db/schema"
import { AppError, notFound } from "@/lib/errors"
import { isUniqueViolation } from "./errors-db"
import type { StudentInput } from "@/lib/validation/schemas"

export type StudentRow = {
  id: string
  identifier: string
  fullName: string
  email: string | null
  phone: string | null
  createdAt: Date
  classCount: number
}

export type AttendanceStats = {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  /** Present + late, as a share of all recorded days. */
  attendanceRate: number
}

export function emptyStats(): AttendanceStats {
  return { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 }
}

export async function listStudents(ownerId: string, search?: string): Promise<StudentRow[]> {
  const term = search?.trim()
  const filter = term
    ? and(
        eq(students.ownerId, ownerId),
        or(ilike(students.fullName, `%${term}%`), ilike(students.identifier, `%${term}%`)),
      )
    : eq(students.ownerId, ownerId)

  return db
    .select({
      id: students.id,
      identifier: students.identifier,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      createdAt: students.createdAt,
      classCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(students)
    .leftJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(filter)
    .groupBy(students.id)
    .orderBy(asc(students.fullName))
}

export async function getOwnedStudent(ownerId: string, studentId: string) {
  const [row] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
  if (!row) throw notFound("Student")
  return row
}

export async function createStudent(ownerId: string, input: StudentInput) {
  try {
    const [row] = await db
      .insert(students)
      .values({ ownerId, ...input })
      .returning()
    return row
  } catch (error) {
    if (isUniqueViolation(error, "students_owner_identifier_unique")) {
      throw new AppError(
        "duplicate_identifier",
        `Student ID "${input.identifier}" is already used in your account.`,
      )
    }
    throw error
  }
}

export async function updateStudent(ownerId: string, studentId: string, input: StudentInput) {
  try {
    const updated = await db
      .update(students)
      .set(input)
      .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
      .returning({ id: students.id })
    if (updated.length === 0) throw notFound("Student")
  } catch (error) {
    if (isUniqueViolation(error, "students_owner_identifier_unique")) {
      throw new AppError(
        "duplicate_identifier",
        `Student ID "${input.identifier}" is already used in your account.`,
      )
    }
    throw error
  }
}

export async function deleteStudent(ownerId: string, studentId: string): Promise<void> {
  const deleted = await db
    .delete(students)
    .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
    .returning({ id: students.id })
  if (deleted.length === 0) throw notFound("Student")
}

/** Classes the student belongs to (scoped to the owner). */
export async function listStudentClasses(ownerId: string, studentId: string) {
  await getOwnedStudent(ownerId, studentId)
  return db
    .select({
      id: classes.id,
      name: classes.name,
      seatNo: enrollments.seatNo,
      joinedAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(eq(enrollments.studentId, studentId), eq(classes.ownerId, ownerId)))
    .orderBy(asc(classes.name))
}

function toStats(counts: Record<string, number>): AttendanceStats {
  const present = counts.present ?? 0
  const absent = counts.absent ?? 0
  const late = counts.late ?? 0
  const excused = counts.excused ?? 0
  const total = present + absent + late + excused
  return {
    total,
    present,
    absent,
    late,
    excused,
    attendanceRate: total === 0 ? 0 : Math.round(((present + late) / total) * 1000) / 10,
  }
}

export async function getStudentStats(
  ownerId: string,
  studentId: string,
): Promise<AttendanceStats> {
  const rows = await db
    .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(attendanceRecords.studentId, studentId), eq(classes.ownerId, ownerId)))
    .groupBy(attendanceRecords.status)

  return toStats(Object.fromEntries(rows.map((row) => [row.status, row.count])))
}

/** Per-class breakdown shown on the student detail page. */
export async function getStudentStatsByClass(ownerId: string, studentId: string) {
  const rows = await db
    .select({
      classId: classes.id,
      className: classes.name,
      status: attendanceRecords.status,
      count: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(attendanceRecords.studentId, studentId), eq(classes.ownerId, ownerId)))
    .groupBy(classes.id, classes.name, attendanceRecords.status)

  const grouped = new Map<string, { className: string; counts: Record<string, number> }>()
  for (const row of rows) {
    const entry = grouped.get(row.classId) ?? { className: row.className, counts: {} }
    entry.counts[row.status] = row.count
    grouped.set(row.classId, entry)
  }

  return [...grouped.entries()]
    .map(([classId, entry]) => ({
      classId,
      className: entry.className,
      stats: toStats(entry.counts),
    }))
    .sort((a, b) => a.className.localeCompare(b.className))
}

export async function getRecentStudentAttendance(ownerId: string, studentId: string, limit = 10) {
  return db
    .select({
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      note: attendanceRecords.note,
      className: classes.name,
      classId: classes.id,
    })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(attendanceRecords.studentId, studentId), eq(classes.ownerId, ownerId)))
    .orderBy(desc(attendanceRecords.date))
    .limit(limit)
}

export { toStats }
