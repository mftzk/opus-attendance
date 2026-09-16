import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL(".", import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingRoot: projectRoot,
  // The deployment platform runs `release_command` from inside
  // `.next/standalone`, so the migration/seed runner and its SQL have to be
  // part of that bundle. `scripts/bundle-runtime-assets.mjs` copies them as
  // well, because some builders rewrite this file.
  outputFileTracingIncludes: {
    "/*": ["./drizzle/*.sql", "./scripts/*.mjs", "./node_modules/postgres/**/*"],
  },
}

export default nextConfig
