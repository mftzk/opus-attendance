// Runs before every deployment starts: migrate, then refresh the demo data.
import { connect, migrate } from "./db.mjs"
import { seed } from "./seed.mjs"

const sql = connect()
try {
  await migrate(sql)
  if (process.env.SEED_DEMO === "false") {
    console.log("SEED_DEMO=false — skipping the demo account.")
  } else {
    await seed(sql)
  }
} finally {
  await sql.end()
}
