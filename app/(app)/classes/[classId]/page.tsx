import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { getOwnedClass, listClassMembers } from "@/lib/services/classes"
import { listEnrollableStudents } from "@/lib/services/enrollments"
import { listRecordedDates } from "@/lib/services/attendance"
import { orNotFound } from "@/lib/not-found"
import { formatDisplayDate, today } from "@/lib/date"
import { CapacityMeter, EmptyState, PageHead } from "@/components/ui"
import { AddStudentForm } from "./add-student-form"
import { ClassSettings } from "./class-settings"
import { RemoveStudentButton } from "./remove-student-button"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ classId: string }> }

export default async function ClassDetailPage({ params }: Props) {
  const { classId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound()

  const user = await requireUser()
  const klass = await orNotFound(getOwnedClass(user.id, classId))
  const [members, enrollable, recordedDates] = await Promise.all([
    listClassMembers(user.id, classId),
    listEnrollableStudents(user.id, classId),
    listRecordedDates(user.id, classId, 7),
  ])

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title={klass.name}
        description={klass.description || "No description"}
        actions={
          <>
            <Link className="button" href="/classes">
              All classes
            </Link>
            <Link
              className="button primary"
              href={`/attendance/${klass.id}?date=${today()}`}
            >
              Take attendance
            </Link>
          </>
        }
      />

      <div className="grid cols-3">
        <div className="card">
          <div className="card-body stack" style={{ gap: 10 }}>
            <div className="stat-label">Capacity</div>
            <CapacityMeter count={klass.studentCount} capacity={klass.capacity} />
            {klass.isFull ? (
              <div className="alert warn">Class capacity reached.</div>
            ) : (
              <p className="hint">
                {klass.capacity - klass.studentCount} seat
                {klass.capacity - klass.studentCount === 1 ? "" : "s"} left.
              </p>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="stat-label">Created</div>
            <div className="stat-value" style={{ fontSize: 16 }}>
              {formatDisplayDate(klass.createdAt.toISOString().slice(0, 10))}
            </div>
            <div className="stat-hint">Owned by {user.name}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body stack" style={{ gap: 8 }}>
            <div className="stat-label">Recent attendance</div>
            {recordedDates.length === 0 ? (
              <p className="hint">No attendance recorded yet.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="stack">
                {recordedDates.slice(0, 4).map((row) => (
                  <li key={row.date} className="spread" style={{ gap: 8 }}>
                    <Link href={`/attendance/${klass.id}?date=${row.date}`} className="mono">
                      {row.date}
                    </Link>
                    <span className="hint">
                      {row.present}/{row.recorded} in attendance
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Students</h2>
          <span className="badge">{klass.studentCount} enrolled</span>
        </div>
        <div className="card-body tight">
          <AddStudentForm
            classId={klass.id}
            isFull={klass.isFull}
            students={enrollable}
            capacity={klass.capacity}
          />
        </div>
        {members.length === 0 ? (
          <EmptyState
            title="No students in this class"
            description="Add students from your register, or create new ones first."
            action={
              <Link className="button" href="/students">
                Go to students
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.enrollmentId}>
                    <td className="mono">{member.seatNo}</td>
                    <td className="mono">{member.identifier}</td>
                    <td>
                      <Link href={`/students/${member.studentId}`}>{member.fullName}</Link>
                    </td>
                    <td className="cell-muted">{member.email || member.phone || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <RemoveStudentButton classId={klass.id} studentId={member.studentId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ClassSettings
        classId={klass.id}
        name={klass.name}
        description={klass.description ?? ""}
      />
    </div>
  )
}
