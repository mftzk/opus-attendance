"use client"

import { useActionState } from "react"
import { changePasswordAction, updateProfileAction } from "@/app/actions/settings"
import { FormFeedback, SubmitButton } from "@/components/form-parts"

export function SettingsForms({
  name,
  email,
  isDemo,
}: {
  name: string
  email: string
  isDemo: boolean
}) {
  const [profileState, profileAction] = useActionState(updateProfileAction, undefined)
  const [passwordState, passwordAction] = useActionState(changePasswordAction, undefined)

  return (
    <div className="stack" style={{ gap: 14 }}>
      <section className="card">
        <div className="card-head">
          <h2>Profile</h2>
        </div>
        <div className="card-body">
          <form action={profileAction} className="stack" style={{ gap: 10, maxWidth: 420 }}>
            <FormFeedback state={profileState} />
            <label className="field">
              Name
              <input type="text" name="name" defaultValue={name} required disabled={isDemo} />
            </label>
            <label className="field">
              Email
              <input type="email" name="email" defaultValue={email} required disabled={isDemo} />
            </label>
            <div className="row">
              <SubmitButton disabled={isDemo} pendingLabel="Saving…">
                Save profile
              </SubmitButton>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Password</h2>
        </div>
        <div className="card-body">
          <form action={passwordAction} className="stack" style={{ gap: 10, maxWidth: 420 }}>
            <FormFeedback state={passwordState} />
            <label className="field">
              Current password
              <input type="password" name="currentPassword" required disabled={isDemo} />
            </label>
            <label className="field">
              New password
              <input
                type="password"
                name="newPassword"
                required
                minLength={8}
                disabled={isDemo}
              />
            </label>
            <div className="row">
              <SubmitButton disabled={isDemo} pendingLabel="Updating…">
                Change password
              </SubmitButton>
              <span className="hint">All other sessions are signed out.</span>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
