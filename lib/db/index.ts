import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // Next.js reloads modules in development; reuse one pool across reloads.
  // eslint-disable-next-line no-var
  var __attendanceSql: ReturnType<typeof postgres> | undefined
}

function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return postgres(url, { max: 10, prepare: false })
}

export const sql = globalThis.__attendanceSql ?? createClient()
if (process.env.NODE_ENV !== "production") globalThis.__attendanceSql = sql

export const db = drizzle(sql, { schema })
export type Database = typeof db
export { schema }
