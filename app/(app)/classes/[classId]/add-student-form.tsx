"use client"

import { useActionState } from "react"
import Link from "next/link"
import { addStudentToClassAction } from "@/app/actions/classes"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

type Student = { id: string; identifier: string; fullName: string }

export function AddStudentForm({
  classId,
  students,
  isFull,
  capacity,
}: {
  classId: string
  students: Student[]
  isFull: boolean
  capacity: number
}) {
  const [state, action] = useActionState(addStudentToClassAction, undefined)

  if (isFull) {
    return (
      <div className="alert warn">
        This class has reached the maximum capacity of {capacity} students. Remove a student before
        adding another one.
      </div>
    )
  }

  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <FormFeedback state={state} />
      <input type="hidden" name="classId" value={classId} />
      <div className="row">
        <select name="studentId" required disabled={students.length === 0} style={{ maxWidth: 360 }}>
          <option value="">
            {students.length === 0 ? "Every student is already enrolled" : "Select a student…"}
          </option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} ({student.identifier})
            </option>
          ))}
        </select>
        <SubmitButton disabled={students.length === 0} pendingLabel="Adding…">
          Add to class
        </SubmitButton>
        <Link className="button ghost small" href="/students">
          Register a new student
        </Link>
      </div>
    </form>
  )
}
