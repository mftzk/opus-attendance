import "server-only"
import { and, eq, notInArray, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { CLASS_CAPACITY, classes, enrollments, students } from "@/lib/db/schema"
import { AppError, notFound } from "@/lib/errors"
import { isCheckViolation, isUniqueViolation } from "./errors-db"

export type EnrollmentResult = { enrollmentId: string; seatNo: number; studentCount: number }

/**
 * Adds a student to a class, never exceeding {@link CLASS_CAPACITY}.
 *
 * Two independent mechanisms keep the rule true:
 *
 *  1. The transaction takes a `SELECT ... FOR UPDATE` row lock on the class
 *     before it counts seats. Concurrent enrollments into the same class are
 *     therefore serialised: the second transaction blocks until the first has
 *     committed and then sees the updated seat list. 29 + two simultaneous
 *     requests can only ever end at 30.
 *  2. Even if that lock were bypassed (a direct SQL insert, a future code
 *     path that forgets the lock), `enrollments` only accepts seat numbers
 *     1..30 (CHECK) and each seat is unique per class (UNIQUE INDEX). The
 *     31st row has no seat left to claim and the database rejects it.
 *
 * Ownership is re-checked here from the session user, so passing another
 * account's class id or student id yields a 404 rather than an enrollment.
 */
export async function enrollStudent(
  ownerId: string,
  classId: string,
  studentId: string,
): Promise<EnrollmentResult> {
  return db.transaction(async (tx) => {
    const [klass] = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
      .for("update")
    if (!klass) throw notFound("Class")

    const [student] = await tx
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
    if (!student) throw notFound("Student")

    const taken = await tx
      .select({ seatNo: enrollments.seatNo, studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.classId, classId))

    if (taken.some((row) => row.studentId === studentId)) {
      throw new AppError("duplicate_enrollment", "Student already belongs to this class.")
    }
    if (taken.length >= CLASS_CAPACITY) {
      throw new AppError(
        "class_full",
        `This class has reached the maximum capacity of ${CLASS_CAPACITY} students.`,
      )
    }

    const used = new Set(taken.map((row) => row.seatNo))
    let seatNo = 1
    while (used.has(seatNo)) seatNo += 1

    try {
      const [row] = await tx
        .insert(enrollments)
        .values({ classId, studentId, seatNo })
        .returning({ id: enrollments.id, seatNo: enrollments.seatNo })
      return { enrollmentId: row.id, seatNo: row.seatNo, studentCount: taken.length + 1 }
    } catch (error) {
      // Backstop for the invariants described above.
      if (isUniqueViolation(error, "enrollments_class_student_unique")) {
        throw new AppError("duplicate_enrollment", "Student already belongs to this class.")
      }
      if (
        isUniqueViolation(error, "enrollments_class_seat_unique") ||
        isCheckViolation(error, "enrollments_seat_range")
      ) {
        throw new AppError(
          "class_full",
          `This class has reached the maximum capacity of ${CLASS_CAPACITY} students.`,
        )
      }
      throw error
    }
  })
}

export async function removeEnrollment(
  ownerId: string,
  classId: string,
  studentId: string,
): Promise<void> {
  const [klass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
  if (!klass) throw notFound("Class")

  const removed = await db
    .delete(enrollments)
    .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
    .returning({ id: enrollments.id })
  if (removed.length === 0) throw notFound("Enrollment")
}

/** Students of this account that are not yet in the given class. */
export async function listEnrollableStudents(ownerId: string, classId: string) {
  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.classId, classId))

  const ids = enrolled.map((row) => row.studentId)
  const where =
    ids.length > 0
      ? and(eq(students.ownerId, ownerId), notInArray(students.id, ids))
      : eq(students.ownerId, ownerId)

  return db
    .select({
      id: students.id,
      identifier: students.identifier,
      fullName: students.fullName,
    })
    .from(students)
    .where(where)
    .orderBy(asc(students.fullName))
}
