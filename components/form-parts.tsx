"use client"

import { useFormStatus } from "react-dom"
import type { ActionResult } from "@/lib/errors"

export function SubmitButton({
  children,
  className = "button primary",
  pendingLabel,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus()
  return (
    <button {...rest} type="submit" className={className} disabled={pending || rest.disabled}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  )
}

/** Renders the success/error feedback returned by a server action. */
export function FormFeedback({ state }: { state?: ActionResult<unknown> }) {
  if (!state) return null
  if (state.ok) {
    return state.message ? <div className="alert ok">{state.message}</div> : null
  }
  return (
    <div className="alert error">
      {state.message}
      {state.details ? (
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {Object.entries(state.details).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
