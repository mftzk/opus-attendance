import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // Next.js reloads modules in development; reuse one pool across reloads.
  // eslint-disable-next-line no-var
  var __attendanceDb: ReturnType<typeof createDatabase> | undefined
}

function createDatabase() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return drizzle(postgres(url, { max: 10, prepare: false }), { schema })
}

/**
 * The connection is opened on first use, not at import time: the production
 * build renders route modules without a database, and a module-level
 * connection would fail the build instead of the request.
 */
export function getDb() {
  if (!globalThis.__attendanceDb) globalThis.__attendanceDb = createDatabase()
  return globalThis.__attendanceDb
}

export type Database = ReturnType<typeof createDatabase>

/** Ergonomic alias so callers can write `db.select(...)` as usual. */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDb() as object, property, receiver)
  },
})

export { schema }
