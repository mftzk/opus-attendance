// Plain-Node database helpers shared by the migration runner and the seeder.
// They intentionally avoid TypeScript and the app bundle so they also run
// inside the deployed `.next/standalone` output.
import { readdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import postgres from "postgres"

// The release command may run from the project root or from inside
// `.next/standalone`, so look for the SQL in both places.
const CANDIDATES = ["drizzle", "../drizzle", "../../drizzle"]

export function connect() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is required")
  return postgres(url, { max: 1, prepare: false })
}

export function migrationsDir() {
  const found = CANDIDATES.map((dir) => resolve(process.cwd(), dir)).find((dir) => existsSync(dir))
  if (!found) throw new Error("Could not locate the drizzle/ migration directory")
  return found
}

/** Applies every unapplied .sql file in order, each in its own transaction. */
export async function migrate(sql) {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`

  const dir = migrationsDir()
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()
  if (files.length === 0) throw new Error(`No .sql migrations found in ${dir}`)

  for (const name of files) {
    const [applied] = await sql`SELECT name FROM schema_migrations WHERE name = ${name}`
    if (applied) {
      console.log(`· ${name} already applied`)
      continue
    }
    const body = await readFile(resolve(dir, name), "utf8")
    await sql.begin(async (tx) => {
      await tx.unsafe(body)
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`
    })
    console.log(`✓ applied ${name}`)
  }
}
