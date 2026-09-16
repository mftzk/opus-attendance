import "server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { CLASS_CAPACITY, classes, enrollments, students } from "@/lib/db/schema"
import { AppError, notFound } from "@/lib/errors"
import { isUniqueViolation } from "./errors-db"
import type { ClassInput } from "@/lib/validation/schemas"

export type ClassSummary = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  studentCount: number
  capacity: number
  isFull: boolean
}

export type ClassMember = {
  enrollmentId: string
  seatNo: number
  studentId: string
  identifier: string
  fullName: string
  email: string | null
  phone: string | null
}

const withCapacity = (row: {
  id: string
  name: string
  description: string | null
  createdAt: Date
  studentCount: number
}): ClassSummary => ({
  ...row,
  capacity: CLASS_CAPACITY,
  isFull: row.studentCount >= CLASS_CAPACITY,
})

export async function listClasses(ownerId: string): Promise<ClassSummary[]> {
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      createdAt: classes.createdAt,
      studentCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(classes)
    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
    .where(eq(classes.ownerId, ownerId))
    .groupBy(classes.id)
    .orderBy(desc(classes.createdAt))

  return rows.map(withCapacity)
}

/** Loads a class the caller owns, or throws 404. Never trust a client-sent id. */
export async function getOwnedClass(ownerId: string, classId: string): Promise<ClassSummary> {
  const [row] = await db
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      createdAt: classes.createdAt,
      studentCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(classes)
    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .groupBy(classes.id)

  if (!row) throw notFound("Class")
  return withCapacity(row)
}

export async function listClassMembers(
  ownerId: string,
  classId: string,
): Promise<ClassMember[]> {
  await getOwnedClass(ownerId, classId)
  return db
    .select({
      enrollmentId: enrollments.id,
      seatNo: enrollments.seatNo,
      studentId: students.id,
      identifier: students.identifier,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(eq(enrollments.classId, classId))
    .orderBy(asc(students.fullName))
}

export async function createClass(ownerId: string, input: ClassInput): Promise<ClassSummary> {
  try {
    const [row] = await db
      .insert(classes)
      .values({ ownerId, name: input.name, description: input.description })
      .returning()
    return withCapacity({ ...row, studentCount: 0 })
  } catch (error) {
    if (isUniqueViolation(error, "classes_owner_name_unique")) {
      throw new AppError("conflict", `You already have a class named "${input.name}".`)
    }
    throw error
  }
}

export async function updateClass(
  ownerId: string,
  classId: string,
  input: ClassInput,
): Promise<void> {
  try {
    const updated = await db
      .update(classes)
      .set({ name: input.name, description: input.description })
      .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
      .returning({ id: classes.id })
    if (updated.length === 0) throw notFound("Class")
  } catch (error) {
    if (isUniqueViolation(error, "classes_owner_name_unique")) {
      throw new AppError("conflict", `You already have a class named "${input.name}".`)
    }
    throw error
  }
}

export async function deleteClass(ownerId: string, classId: string): Promise<void> {
  const deleted = await db
    .delete(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .returning({ id: classes.id })
  if (deleted.length === 0) throw notFound("Class")
}
