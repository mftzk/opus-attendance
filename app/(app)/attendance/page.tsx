import Link from "next/link"
import { requireUser } from "@/lib/auth/session"
import { listClasses } from "@/lib/services/classes"
import { listStudents } from "@/lib/services/students"
import { getHistoryStats, listAttendanceHistory } from "@/lib/services/attendance"
import { attendanceFilterSchema } from "@/lib/validation/schemas"
import { formatDisplayDate, today } from "@/lib/date"
import { EmptyState, PageHead, StatCard, StatusBadge } from "@/components/ui"

export const metadata = { title: "Attendance · Attendance" }
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AttendancePage({ searchParams }: Props) {
  const user = await requireUser()
  const raw = await searchParams

  const cleaned = Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  )
  const parsed = attendanceFilterSchema.safeParse(cleaned)
  const filter = parsed.success ? parsed.data : attendanceFilterSchema.parse({})

  const [classes, students, history, stats] = await Promise.all([
    listClasses(user.id),
    listStudents(user.id),
    listAttendanceHistory(user.id, filter),
    getHistoryStats(user.id, filter),
  ])

  const pageCount = Math.max(1, Math.ceil(history.total / history.pageSize))
  const pageHref = (page: number) => {
    const params = new URLSearchParams(
      Object.entries(cleaned).map(([key, value]) => [key, String(value)]),
    )
    params.set("page", String(page))
    return `/attendance?${params.toString()}`
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title="Attendance"
        description="Record a day for one of your classes, then review the history below."
      />

      <section className="card">
        <div className="card-head">
          <h2>Take attendance</h2>
          <span className="hint">Today is {formatDisplayDate(today())}</span>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create a class and add students before recording attendance."
            action={
              <Link className="button primary" href="/classes/new">
                Create a class
              </Link>
            }
          />
        ) : (
          <div className="card-body row">
            {classes.map((klass) => (
              <Link
                key={klass.id}
                className="button"
                href={`/attendance/${klass.id}?date=${today()}`}
              >
                {klass.name}
                <span className="badge accent">{klass.studentCount}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid cols-4">
        <StatCard label="Records" value={stats.total} hint="Matching the filter" />
        <StatCard label="Present" value={stats.present} />
        <StatCard label="Absent" value={stats.absent} />
        <StatCard
          label="Rate"
          value={`${stats.attendanceRate}%`}
          hint="Present + late over total"
        />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>History</h2>
          <span className="hint">{history.total} records</span>
        </div>
        <div className="card-body tight">
          <form method="get" className="row" style={{ gap: 8 }}>
            <select name="classId" defaultValue={filter.classId ?? ""} style={{ width: 190 }}>
              <option value="">All classes</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
            <select name="studentId" defaultValue={filter.studentId ?? ""} style={{ width: 200 }}>
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.identifier})
                </option>
              ))}
            </select>
            <select name="status" defaultValue={filter.status ?? ""} style={{ width: 140 }}>
              <option value="">Any status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
            <input type="date" name="date" defaultValue={filter.date ?? ""} style={{ width: 160 }} />
            <input type="date" name="from" defaultValue={filter.from ?? ""} style={{ width: 160 }} />
            <input type="date" name="to" defaultValue={filter.to ?? ""} style={{ width: 160 }} />
            <button className="button" type="submit">
              Apply
            </button>
            <Link className="button ghost" href="/attendance">
              Reset
            </Link>
          </form>
        </div>

        {history.rows.length === 0 ? (
          <EmptyState
            title="No attendance records"
            description="Nothing matches this filter yet. Record a day above, or widen the filter."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="mono">{row.date}</td>
                      <td>
                        <Link href={`/classes/${row.classId}`}>{row.className}</Link>
                      </td>
                      <td>
                        <Link href={`/students/${row.studentId}`}>{row.studentName}</Link>{" "}
                        <span className="hint mono">{row.studentIdentifier}</span>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="cell-muted">{row.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <div className="sticky-bar">
                <span className="hint">
                  Page {history.page} of {pageCount}
                </span>
                <div className="row">
                  {history.page > 1 ? (
                    <Link className="button small" href={pageHref(history.page - 1)}>
                      Previous
                    </Link>
                  ) : null}
                  {history.page < pageCount ? (
                    <Link className="button small" href={pageHref(history.page + 1)}>
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
