import Link from "next/link"
import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in · Attendance" }

export default function LoginPage() {
  return (
    <div className="auth-card stack">
      <div className="brand" style={{ justifyContent: "center" }}>
        <span className="brand-mark">A</span> Attendance
      </div>
      <div className="card">
        <div className="card-body stack">
          <div>
            <h1>Sign in</h1>
            <p className="hint" style={{ marginTop: 4 }}>
              Track classes, students and daily attendance.
            </p>
          </div>
          <LoginForm />
          <p className="hint" style={{ textAlign: "center" }}>
            No account? <Link href="/register" style={{ color: "var(--accent)" }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
