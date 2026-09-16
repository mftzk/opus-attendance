"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { saveAttendanceAction } from "@/app/actions/attendance"
import { FormFeedback, SubmitButton } from "@/components/form-parts"
import type { AttendanceStatus } from "@/lib/db/schema"

type Row = {
  studentId: string
  identifier: string
  fullName: string
  status: AttendanceStatus | null
  note: string | null
}

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"]
const label = (status: AttendanceStatus) => status.charAt(0).toUpperCase() + status.slice(1)

export function AttendanceSheetForm({
  classId,
  date,
  rows,
}: {
  classId: string
  date: string
  rows: Row[]
}) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.status ?? "present"])),
  )
  const [state, action] = useActionState(saveAttendanceAction, undefined)

  // Keep the sheet in sync when the date (and therefore the server data) changes.
  useEffect(() => {
    setStatuses(Object.fromEntries(rows.map((row) => [row.studentId, row.status ?? "present"])))
  }, [rows])

  const counts = STATUSES.map((status) => ({
    status,
    total: Object.values(statuses).filter((value) => value === status).length,
  }))

  return (
    <form action={action} className="card">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />

      <div className="card-head">
        <div className="row">
          <label className="row" style={{ gap: 6 }}>
            <span className="hint">Date</span>
            <input
              type="date"
              defaultValue={date}
              onChange={(event) => {
                if (event.target.value) {
                  router.push(`/attendance/${classId}?date=${event.target.value}`)
                }
              }}
              style={{ width: 160 }}
            />
          </label>
          <button
            type="button"
            className="button small"
            onClick={() =>
              setStatuses(Object.fromEntries(rows.map((row) => [row.studentId, "present"])))
            }
          >
            Mark all present
          </button>
        </div>
        <div className="row">
          {counts.map((entry) => (
            <span key={entry.status} className={`badge ${entry.status}`}>
              {label(entry.status)} {entry.total}
            </span>
          ))}
        </div>
      </div>

      <div className="card-body tight">
        <FormFeedback state={state} />
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="mono">{row.identifier}</td>
                <td>{row.fullName}</td>
                <td>
                  <div className="status-group">
                    {STATUSES.map((status) => (
                      <label key={status}>
                        <input
                          type="radio"
                          name={`status-${row.studentId}`}
                          value={status}
                          checked={statuses[row.studentId] === status}
                          onChange={() =>
                            setStatuses((previous) => ({ ...previous, [row.studentId]: status }))
                          }
                        />
                        <span>{label(status)}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    name={`note-${row.studentId}`}
                    defaultValue={row.note ?? ""}
                    placeholder="Optional note"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky-bar">
        <span className="hint">
          Saving again for {date} updates the existing records instead of duplicating them.
        </span>
        <SubmitButton pendingLabel="Saving…">Save attendance</SubmitButton>
      </div>
    </form>
  )
}
