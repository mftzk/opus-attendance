import Link from "next/link"
import { PageHead } from "@/components/ui"
import { NewClassForm } from "./new-class-form"

export const metadata = { title: "New class · Attendance" }

export default function NewClassPage() {
  return (
    <div className="stack" style={{ gap: 18, maxWidth: 520 }}>
      <PageHead
        title="New class"
        description="Name it after the group you take attendance for."
        actions={
          <Link className="button" href="/classes">
            Cancel
          </Link>
        }
      />
      <div className="card">
        <div className="card-body">
          <NewClassForm />
        </div>
      </div>
    </div>
  )
}
