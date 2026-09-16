"use client"

import { useActionState } from "react"
import { removeStudentFromClassAction } from "@/app/actions/classes"
import { SubmitButton } from "@/components/form-parts"

export function RemoveStudentButton({
  classId,
  studentId,
}: {
  classId: string
  studentId: string
}) {
  const [state, action] = useActionState(removeStudentFromClassAction, undefined)
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !confirm("Remove this student from the class? Their attendance for this class is deleted.")
        ) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <SubmitButton className="button ghost small" pendingLabel="Removing…">
        Remove
      </SubmitButton>
      {state && !state.ok ? <span className="error-text">{state.message}</span> : null}
    </form>
  )
}
