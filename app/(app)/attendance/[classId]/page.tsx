import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { getAttendanceSheet } from "@/lib/services/attendance"
import { orNotFound } from "@/lib/not-found"
import { isValidIsoDate, today } from "@/lib/date"
import { EmptyState, PageHead } from "@/components/ui"
import { AttendanceSheetForm } from "./attendance-sheet-form"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function TakeAttendancePage({ params, searchParams }: Props) {
  const { classId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(classId)) notFound()

  const requested = (await searchParams).date
  const date = requested && isValidIsoDate(requested) ? requested : today()

  const user = await requireUser()
  const sheet = await orNotFound(getAttendanceSheet(user.id, classId, date))

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title={`Attendance · ${sheet.class.name}`}
        description={`${sheet.class.studentCount} / ${sheet.class.capacity} students · ${sheet.recordedCount} recorded for this date`}
        actions={
          <>
            <Link className="button" href={`/classes/${sheet.class.id}`}>
              Class page
            </Link>
            <Link className="button" href="/attendance">
              History
            </Link>
          </>
        }
      />

      {sheet.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No students in this class"
            description="Add students to the class before taking attendance."
            action={
              <Link className="button primary" href={`/classes/${sheet.class.id}`}>
                Add students
              </Link>
            }
          />
        </div>
      ) : (
        <AttendanceSheetForm classId={sheet.class.id} date={sheet.date} rows={sheet.rows} />
      )}
    </div>
  )
}
