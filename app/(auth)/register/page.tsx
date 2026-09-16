import Link from "next/link"
import { RegisterForm } from "./register-form"

export const metadata = { title: "Create account · Attendance" }

export default function RegisterPage() {
  return (
    <div className="auth-card stack">
      <div className="brand" style={{ justifyContent: "center" }}>
        <span className="brand-mark">A</span> Attendance
      </div>
      <div className="card">
        <div className="card-body stack">
          <div>
            <h1>Create your account</h1>
            <p className="hint" style={{ marginTop: 4 }}>
              Your classes and students stay private to this account.
            </p>
          </div>
          <RegisterForm />
          <p className="hint" style={{ textAlign: "center" }}>
            Already registered? <Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
