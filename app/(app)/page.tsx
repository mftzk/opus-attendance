import Link from "next/link"
import { requireUser } from "@/lib/auth/session"
import { getDashboard } from "@/lib/services/dashboard"
import { formatDisplayDate } from "@/lib/date"
import { CapacityMeter, EmptyState, PageHead, StatCard } from "@/components/ui"

export const metadata = { title: "Dashboard · Attendance" }
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireUser()
  const data = await getDashboard(user.id)

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title={`Good day, ${user.name.split(" ")[0]}`}
        description={`Overview for ${formatDisplayDate(data.today)}`}
        actions={
          <Link className="button primary" href="/attendance">
            Take attendance
          </Link>
        }
      />

      <div className="grid cols-4">
        <StatCard label="Classes" value={data.classCount} hint="Active classes you own" />
        <StatCard label="Students" value={data.studentCount} hint="Registered in your account" />
        <StatCard
          label="Recorded today"
          value={data.recordedToday}
          hint={data.recordedToday === 0 ? "Nothing recorded yet" : "Attendance entries saved"}
        />
        <StatCard
          label="Average attendance"
          value={`${data.overall.attendanceRate}%`}
          hint={`${data.overall.total} records · present + late`}
        />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Your classes</h2>
          <Link className="button small" href="/classes">
            Manage classes
          </Link>
        </div>
        {data.classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create your first class to start registering students and taking attendance."
            action={
              <Link className="button primary" href="/classes/new">
                Create a class
              </Link>
            }
          />
        ) : (
          <div className="card-body grid cols-3">
            {data.classes.map((klass) => (
              <Link
                key={klass.id}
                href={`/classes/${klass.id}`}
                className="card"
                style={{ display: "block", boxShadow: "none" }}
              >
                <div className="card-body stack" style={{ gap: 10 }}>
                  <div>
                    <h3>{klass.name}</h3>
                    <p className="hint" style={{ marginTop: 2 }}>
                      {klass.description || "No description"}
                    </p>
                  </div>
                  <CapacityMeter count={klass.studentCount} capacity={klass.capacity} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
