// Next.js `output: "standalone"` only traces what the server imports. The
// release command runs from inside that bundle and needs the SQL migrations,
// the plain-Node scripts and the `postgres` driver, so copy them explicitly —
// some build platforms rewrite next.config.mjs and drop the tracing hints.
import { cp, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const standalone = resolve(".next/standalone")
if (!existsSync(standalone)) {
  console.log("No standalone output — nothing to bundle.")
  process.exit(0)
}

for (const dir of ["scripts", "drizzle"]) {
  await mkdir(resolve(standalone, dir), { recursive: true })
  await cp(resolve(dir), resolve(standalone, dir), { recursive: true })
}

const driver = resolve(standalone, "node_modules/postgres")
await mkdir(driver, { recursive: true })
await cp(resolve("node_modules/postgres"), driver, { recursive: true })

console.log("Bundled scripts/, drizzle/ and the postgres driver into .next/standalone.")
