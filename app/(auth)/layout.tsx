import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/session"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/")
  return <div className="auth-shell">{children}</div>
}
