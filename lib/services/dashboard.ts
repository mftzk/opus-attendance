import "server-only"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { attendanceRecords, classes, students } from "@/lib/db/schema"
import { listClasses, type ClassSummary } from "./classes"
import { toStats, type AttendanceStats } from "./students"
import { today } from "@/lib/date"

export type DashboardData = {
  classCount: number
  studentCount: number
  recordedToday: number
  today: string
  overall: AttendanceStats
  classes: ClassSummary[]
}

export async function getDashboard(ownerId: string): Promise<DashboardData> {
  const date = today()

  const [classList, [studentCount], [recordedToday], statusRows] = await Promise.all([
    listClasses(ownerId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.ownerId, ownerId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .where(and(eq(classes.ownerId, ownerId), eq(attendanceRecords.date, date))),
    db
      .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .where(eq(classes.ownerId, ownerId))
      .groupBy(attendanceRecords.status),
  ])

  return {
    classCount: classList.length,
    studentCount: studentCount?.count ?? 0,
    recordedToday: recordedToday?.count ?? 0,
    today: date,
    overall: toStats(Object.fromEntries(statusRows.map((row) => [row.status, row.count]))),
    classes: classList,
  }
}
