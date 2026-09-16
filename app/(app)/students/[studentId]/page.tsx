import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import {
  getOwnedStudent,
  getRecentStudentAttendance,
  getStudentStats,
  getStudentStatsByClass,
  listStudentClasses,
} from "@/lib/services/students"
import { orNotFound } from "@/lib/not-found"
import { formatDisplayDate } from "@/lib/date"
import { EmptyState, PageHead, StatCard, StatusBadge } from "@/components/ui"
import { StudentSettings } from "./student-settings"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ studentId: string }> }

export default async function StudentDetailPage({ params }: Props) {
  const { studentId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) notFound()

  const user = await requireUser()
  const student = await orNotFound(getOwnedStudent(user.id, studentId))
  const [classes, stats, perClass, recent] = await Promise.all([
    listStudentClasses(user.id, studentId),
    getStudentStats(user.id, studentId),
    getStudentStatsByClass(user.id, studentId),
    getRecentStudentAttendance(user.id, studentId, 12),
  ])

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title={student.fullName}
        description={`${student.identifier}${student.email ? ` · ${student.email}` : ""}${
          student.phone ? ` · ${student.phone}` : ""
        }`}
        actions={
          <>
            <Link className="button" href="/students">
              All students
            </Link>
            <Link className="button" href={`/attendance?studentId=${student.id}`}>
              Attendance history
            </Link>
          </>
        }
      />

      <div className="grid cols-4">
        <StatCard
          label="Attendance rate"
          value={`${stats.attendanceRate}%`}
          hint={`${stats.total} recorded day${stats.total === 1 ? "" : "s"}`}
        />
        <StatCard label="Present" value={stats.present} hint="Marked present" />
        <StatCard label="Absent" value={stats.absent} hint="Marked absent" />
        <StatCard
          label="Late / Excused"
          value={`${stats.late} / ${stats.excused}`}
          hint="Late counts toward attendance"
        />
      </div>

      <div className="grid cols-2">
        <section className="card">
          <div className="card-head">
            <h2>Classes</h2>
            <span className="badge">{classes.length} enrolled</span>
          </div>
          {classes.length === 0 ? (
            <EmptyState
              title="Not in any class"
              description="Add this student to a class from the class page."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Seat</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((klass) => {
                    const row = perClass.find((entry) => entry.classId === klass.id)
                    return (
                      <tr key={klass.id}>
                        <td>
                          <Link href={`/classes/${klass.id}`}>{klass.name}</Link>
                        </td>
                        <td className="mono">{klass.seatNo}</td>
                        <td className="cell-muted">
                          {row ? `${row.stats.attendanceRate}% of ${row.stats.total}` : "No records"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent attendance</h2>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="No attendance yet"
              description="Records appear here once you take attendance for a class this student is in."
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={`${row.classId}-${row.date}`}>
                      <td className="mono">{formatDisplayDate(row.date)}</td>
                      <td className="cell-muted">{row.className}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <StudentSettings
        studentId={student.id}
        identifier={student.identifier}
        fullName={student.fullName}
        email={student.email ?? ""}
        phone={student.phone ?? ""}
      />
    </div>
  )
}
