import Link from "next/link"

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="card-body stack">
          <h1>Not found</h1>
          <p className="hint">
            This page does not exist, or it belongs to another account. If you followed a link from
            somewhere else, ask the owner to share it with you.
          </p>
          <Link className="button primary" href="/">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
