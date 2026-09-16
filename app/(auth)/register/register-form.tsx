"use client"

import { useActionState } from "react"
import { registerAction } from "@/app/actions/auth"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined)
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <FormFeedback state={state} />
      <label className="field">
        Name
        <input type="text" name="name" autoComplete="name" required />
      </label>
      <label className="field">
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input type="password" name="password" autoComplete="new-password" required minLength={8} />
        <span className="hint">At least 8 characters.</span>
      </label>
      <SubmitButton className="button primary block" pendingLabel="Creating…">
        Create account
      </SubmitButton>
    </form>
  )
}
