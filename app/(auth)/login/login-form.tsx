"use client"

import { useActionState } from "react"
import { demoLoginAction, loginAction } from "@/app/actions/auth"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined)
  const [demoState, demoAction] = useActionState(async () => demoLoginAction(), undefined)

  return (
    <div className="stack" style={{ gap: 12 }}>
      <form action={action} className="stack" style={{ gap: 10 }}>
        <FormFeedback state={state} />
        <label className="field">
          Email
          <input type="email" name="email" autoComplete="email" required placeholder="you@school.edu" />
        </label>
        <label className="field">
          Password
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <SubmitButton className="button primary block" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <div className="divider">or</div>

      <form action={demoAction} className="stack" style={{ gap: 8 }}>
        <FormFeedback state={demoState} />
        <SubmitButton className="button block" pendingLabel="Opening demo…">
          Try Demo
        </SubmitButton>
        <p className="hint" style={{ textAlign: "center" }}>
          The demo account is shared by every visitor, already filled with sample classes and
          attendance. Anything you change there is visible to others and may be reset.
        </p>
      </form>
    </div>
  )
}
