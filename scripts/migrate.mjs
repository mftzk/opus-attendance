import { connect, migrate } from "./db.mjs"

const sql = connect()
try {
  await migrate(sql)
  console.log("Database is up to date.")
} finally {
  await sql.end()
}
