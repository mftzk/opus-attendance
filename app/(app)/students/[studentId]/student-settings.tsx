"use client"

import { useActionState } from "react"
import { deleteStudentAction, updateStudentAction } from "@/app/actions/students"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function StudentSettings(props: {
  studentId: string
  identifier: string
  fullName: string
  email: string
  phone: string
}) {
  const [state, action] = useActionState(updateStudentAction, undefined)
  const [deleteState, deleteAction] = useActionState(deleteStudentAction, undefined)

  return (
    <section className="card">
      <div className="card-head">
        <h2>Student details</h2>
      </div>
      <div className="card-body stack">
        <form action={action} className="stack" style={{ gap: 10, maxWidth: 520 }}>
          <FormFeedback state={state} />
          <input type="hidden" name="studentId" value={props.studentId} />
          <label className="field">
            Student ID
            <input type="text" name="identifier" defaultValue={props.identifier} required />
          </label>
          <label className="field">
            Full name
            <input type="text" name="fullName" defaultValue={props.fullName} required />
          </label>
          <label className="field">
            Email
            <input type="email" name="email" defaultValue={props.email} />
          </label>
          <label className="field">
            Phone
            <input type="tel" name="phone" defaultValue={props.phone} />
          </label>
          <div className="row">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !confirm(
                "Delete this student? Their enrollments and attendance records are deleted too.",
              )
            ) {
              event.preventDefault()
            }
          }}
          className="stack"
          style={{ gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}
        >
          <FormFeedback state={deleteState} />
          <input type="hidden" name="studentId" value={props.studentId} />
          <div className="spread">
            <span className="hint">
              Removing a student deletes their enrollments and attendance history.
            </span>
            <SubmitButton className="button danger" pendingLabel="Deleting…">
              Delete student
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  )
}
