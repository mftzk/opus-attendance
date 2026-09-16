import Link from "next/link"
import { requireUser } from "@/lib/auth/session"
import { listStudents } from "@/lib/services/students"
import { EmptyState, PageHead } from "@/components/ui"
import { NewStudentForm } from "./new-student-form"
import { StudentSearch } from "./student-search"

export const metadata = { title: "Students · Attendance" }
export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ search?: string }> }

export default async function StudentsPage({ searchParams }: Props) {
  const { search } = await searchParams
  const user = await requireUser()
  const students = await listStudents(user.id, search)

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title="Students"
        description="Student IDs are unique inside your account. A student can join several classes."
      />

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
        <section className="card">
          <div className="card-head">
            <h2>Register</h2>
            <StudentSearch defaultValue={search ?? ""} />
          </div>
          {students.length === 0 ? (
            <EmptyState
              title={search ? "No students match that search" : "No students yet"}
              description={
                search
                  ? "Try a different name or student ID."
                  : "Register your students once, then add them to as many classes as you need."
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="mono">{student.identifier}</td>
                      <td>
                        <Link href={`/students/${student.id}`}>{student.fullName}</Link>
                      </td>
                      <td className="cell-muted">{student.email || "—"}</td>
                      <td className="cell-muted">{student.phone || "—"}</td>
                      <td className="cell-muted">{student.classCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" style={{ alignSelf: "start" }}>
          <div className="card-head">
            <h2>Register a student</h2>
          </div>
          <div className="card-body">
            <NewStudentForm />
          </div>
        </section>
      </div>
    </div>
  )
}
