import Link from "next/link"
import type { ReactNode } from "react"
import { CLASS_CAPACITY, type AttendanceStatus } from "@/lib/db/schema"

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint ? <div className="stat-hint">{hint}</div> : null}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={`badge ${status}`}>{label}</span>
}

export function CapacityMeter({ count, capacity = CLASS_CAPACITY }: { count: number; capacity?: number }) {
  const full = count >= capacity
  const width = Math.min(100, Math.round((count / capacity) * 100))
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 150 }}>
      <div className="spread" style={{ gap: 8 }}>
        <span className="capacity-text">
          {count} / {capacity} students
        </span>
        {full ? <span className="badge full">Full</span> : null}
      </div>
      <div className={`meter${full ? " full" : ""}`}>
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function ClassCard({
  id,
  name,
  description,
  studentCount,
}: {
  id: string
  name: string
  description: string | null
  studentCount: number
}) {
  return (
    <Link href={`/classes/${id}`} className="card" style={{ display: "block" }}>
      <div className="card-body stack" style={{ gap: 10 }}>
        <div>
          <h2>{name}</h2>
          <p className="hint" style={{ marginTop: 2 }}>
            {description || "No description"}
          </p>
        </div>
        <CapacityMeter count={studentCount} />
      </div>
    </Link>
  )
}

export function PageHead({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </header>
  )
}
