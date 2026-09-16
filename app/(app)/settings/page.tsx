import { requireUser } from "@/lib/auth/session"
import { PageHead } from "@/components/ui"
import { timeZone } from "@/lib/date"
import { CLASS_CAPACITY } from "@/lib/db/schema"
import { SettingsForms } from "./settings-forms"

export const metadata = { title: "Settings · Attendance" }
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <div className="stack" style={{ gap: 18, maxWidth: 720 }}>
      <PageHead title="Settings" description="Your account and the rules this workspace follows." />

      {user.isDemo ? (
        <div className="alert info">
          This is the shared demo account. Profile and password changes are disabled here so other
          visitors can keep signing in. Create your own account to change these.
        </div>
      ) : null}

      <SettingsForms name={user.name} email={user.email} isDemo={user.isDemo} />

      <section className="card">
        <div className="card-head">
          <h2>Workspace rules</h2>
        </div>
        <div className="card-body stack" style={{ gap: 8 }}>
          <div className="spread">
            <span>Maximum students per class</span>
            <span className="badge accent">{CLASS_CAPACITY}</span>
          </div>
          <div className="spread">
            <span>Attendance time zone</span>
            <span className="badge">{timeZone}</span>
          </div>
          <div className="spread">
            <span>Account created</span>
            <span className="hint">{user.createdAt.toISOString().slice(0, 10)}</span>
          </div>
          <p className="hint">
            Classes, students, enrollments and attendance are scoped to your account. Requests for
            another account&apos;s data are rejected by the server, not just hidden in the interface.
          </p>
        </div>
      </section>
    </div>
  )
}
