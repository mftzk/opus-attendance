"use client"

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="card-body stack">
          <h1>Something went wrong</h1>
          <p className="hint">
            The request failed. This is usually temporary — try again, and check that the database
            is reachable if it keeps happening.
          </p>
          <button className="button primary" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
