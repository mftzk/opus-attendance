"use client"

import { useActionState } from "react"
import { createClassAction } from "@/app/actions/classes"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function NewClassForm() {
  const [state, action] = useActionState(createClassAction, undefined)
  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <FormFeedback state={state} />
      <label className="field">
        Class name
        <input type="text" name="name" required placeholder="Computer Science A" />
      </label>
      <label className="field">
        Description <span className="hint">Optional</span>
        <textarea name="description" placeholder="Semester 1 — Lab B2, Mon/Wed 08:00" />
      </label>
      <div className="row">
        <SubmitButton pendingLabel="Creating…">Create class</SubmitButton>
      </div>
    </form>
  )
}
