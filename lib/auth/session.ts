import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { sessions, users } from "@/lib/db/schema"
import { unauthorized } from "@/lib/errors"

const COOKIE = "attendance_session"
const TTL_DAYS = 30

export type SessionUser = {
  id: string
  name: string
  email: string
  isDemo: boolean
  createdAt: Date
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt })
  // Opportunistic cleanup; keeps the table from growing without a cron job.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  store.delete(COOKIE)
}

/**
 * The signed-in user, or null. Cached per request so a page that renders
 * several server components only hits the database once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isDemo: users.isDemo,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return row ?? null
})

/** Use in every server action / route handler that touches owned data. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthorized()
  return user
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}

export const sessionCookieName = COOKIE
