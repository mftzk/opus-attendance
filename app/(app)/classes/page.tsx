import Link from "next/link"
import { requireUser } from "@/lib/auth/session"
import { listClasses } from "@/lib/services/classes"
import { ClassCard, EmptyState, PageHead } from "@/components/ui"

export const metadata = { title: "Classes · Attendance" }
export const dynamic = "force-dynamic"

export default async function ClassesPage() {
  const user = await requireUser()
  const classes = await listClasses(user.id)

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHead
        title="Classes"
        description="Every class holds a maximum of 30 students."
        actions={
          <Link className="button primary" href="/classes/new">
            New class
          </Link>
        }
      />

      {classes.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No classes yet"
            description="A class groups the students whose attendance you record together."
            action={
              <Link className="button primary" href="/classes/new">
                Create a class
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid cols-3">
          {classes.map((klass) => (
            <ClassCard key={klass.id} {...klass} />
          ))}
        </div>
      )}
    </div>
  )
}
