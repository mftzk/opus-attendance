"use client"

import { useActionState, useRef } from "react"
import { createStudentAction } from "@/app/actions/students"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function NewStudentForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action] = useActionState(
    async (prev: Awaited<ReturnType<typeof createStudentAction>> | undefined, data: FormData) => {
      const result = await createStudentAction(prev, data)
      if (result.ok) formRef.current?.reset()
      return result
    },
    undefined,
  )

  return (
    <form ref={formRef} action={action} className="stack" style={{ gap: 10 }}>
      <FormFeedback state={state} />
      <label className="field">
        Student ID
        <input type="text" name="identifier" required placeholder="S-1001" />
      </label>
      <label className="field">
        Full name
        <input type="text" name="fullName" required placeholder="Anita Wijaya" />
      </label>
      <label className="field">
        Email <span className="hint">Optional</span>
        <input type="email" name="email" placeholder="anita@example.edu" />
      </label>
      <label className="field">
        Phone <span className="hint">Optional</span>
        <input type="tel" name="phone" placeholder="+62 812 0000 0000" />
      </label>
      <SubmitButton className="button primary block" pendingLabel="Saving…">
        Register student
      </SubmitButton>
    </form>
  )
}
