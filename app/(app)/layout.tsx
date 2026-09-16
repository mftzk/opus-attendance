import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/session"
import { logoutAction } from "@/app/actions/auth"
import { Nav } from "@/components/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <div>
      {user.isDemo ? (
        <div className="demo-banner">
          You are signed in to the shared demo account. Everyone exploring the app uses this same
          data, so it changes often and is reset on every deployment.
        </div>
      ) : null}
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">A</span> Attendance
          </div>
          <Nav />
          <div className="sidebar-footer">
            <div className="account">
              <strong>{user.name}</strong>
              {user.email}
            </div>
            <form action={logoutAction}>
              <button className="button ghost small" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  )
}
