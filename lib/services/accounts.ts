import "server-only"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { AppError, validation } from "@/lib/errors"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { isUniqueViolation } from "./errors-db"

const byEmail = (email: string) => sql`lower(${users.email}) = ${email.trim().toLowerCase()}`

export async function registerUser(input: { name: string; email: string; password: string }) {
  try {
    const [row] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
      })
      .returning({ id: users.id })
    return row
  } catch (error) {
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new AppError("duplicate_email", "An account with that email already exists.")
    }
    throw error
  }
}

export async function authenticate(email: string, password: string) {
  const [user] = await db.select().from(users).where(byEmail(email)).limit(1)
  // Same message either way: do not reveal which emails are registered.
  const invalid = validation("Email or password is incorrect.")
  if (!user) {
    // Keep the timing comparable to a real verification.
    await hashPassword(password)
    throw invalid
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalid
  return { id: user.id, isDemo: user.isDemo }
}

export async function demoUser() {
  const email = (process.env.DEMO_EMAIL || "demo@attendance.app").toLowerCase()
  const [user] = await db.select().from(users).where(byEmail(email)).limit(1)
  if (!user) throw new AppError("not_found", "The demo account has not been seeded yet.")
  return { id: user.id, email: user.email }
}

export async function updateProfile(userId: string, input: { name: string; email: string }) {
  try {
    await db
      .update(users)
      .set({ name: input.name, email: input.email.trim().toLowerCase() })
      .where(eq(users.id, userId))
  } catch (error) {
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new AppError("duplicate_email", "That email is already taken.")
    }
    throw error
  }
}

export async function changePassword(userId: string, current: string, next: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new AppError("not_found", "Account not found.")
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw validation("Your current password is incorrect.")
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, userId))
}
