"use client"

import { useActionState } from "react"
import { deleteClassAction, updateClassAction } from "@/app/actions/classes"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function ClassSettings({
  classId,
  name,
  description,
}: {
  classId: string
  name: string
  description: string
}) {
  const [state, action] = useActionState(updateClassAction, undefined)
  const [deleteState, deleteAction] = useActionState(deleteClassAction, undefined)

  return (
    <section className="card">
      <div className="card-head">
        <h2>Class settings</h2>
      </div>
      <div className="card-body stack">
        <form action={action} className="stack" style={{ gap: 10, maxWidth: 520 }}>
          <FormFeedback state={state} />
          <input type="hidden" name="classId" value={classId} />
          <label className="field">
            Name
            <input type="text" name="name" defaultValue={name} required />
          </label>
          <label className="field">
            Description
            <textarea name="description" defaultValue={description} />
          </label>
          <div className="row">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!confirm("Delete this class? Enrollments and attendance history go with it.")) {
              event.preventDefault()
            }
          }}
          className="stack"
          style={{ gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14 }}
        >
          <FormFeedback state={deleteState} />
          <input type="hidden" name="classId" value={classId} />
          <div className="spread">
            <span className="hint">
              Deleting a class removes its enrollments and attendance records. Students stay in your
              register.
            </span>
            <SubmitButton className="button danger" pendingLabel="Deleting…">
              Delete class
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  )
}
