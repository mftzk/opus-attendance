/**
 * Proves the 30-student capacity rule holds when the API is called directly
 * and concurrently.
 *
 *   BASE_URL=http://localhost:3000 node scripts/capacity-race-check.mjs
 *
 * It signs in to the demo account, builds a scratch class, fills it to 29
 * students, then fires N enrollment requests for N different students at the
 * same time. Exactly one may succeed; the rest must come back 409 and the
 * class must end at 30 — never 31.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const PARALLEL = Number(process.env.PARALLEL || 5)
const CAPACITY = 30

let cookie = ""

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const setCookie = response.headers.get("set-cookie")
  if (setCookie) cookie = setCookie.split(";")[0]
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

function fail(message) {
  console.error(`FAIL — ${message}`)
  process.exit(1)
}

const login = await api("/api/auth/login", { method: "POST", body: { demo: true } })
if (login.status !== 200) fail(`demo sign-in failed (${login.status})`)

const students = (await api("/api/students")).payload.data ?? []
if (students.length < CAPACITY + PARALLEL) {
  fail(`need at least ${CAPACITY + PARALLEL} demo students, found ${students.length}`)
}

const created = await api("/api/classes", {
  method: "POST",
  body: { name: `Capacity Race ${Date.now()}`, description: "temporary — created by the checker" },
})
if (created.status !== 201) fail(`class creation failed: ${JSON.stringify(created.payload)}`)
const classId = created.payload.data.id

try {
  for (const student of students.slice(0, CAPACITY - 1)) {
    const result = await api(`/api/classes/${classId}/enrollments`, {
      method: "POST",
      body: { studentId: student.id },
    })
    if (result.status !== 201) fail(`seeding enrollment failed: ${JSON.stringify(result.payload)}`)
  }
  console.log(`Class filled to ${CAPACITY - 1} / ${CAPACITY}.`)

  const contenders = students.slice(CAPACITY - 1, CAPACITY - 1 + PARALLEL)
  const results = await Promise.all(
    contenders.map((student) =>
      api(`/api/classes/${classId}/enrollments`, {
        method: "POST",
        body: { studentId: student.id },
      }),
    ),
  )

  const accepted = results.filter((result) => result.status === 201)
  const rejected = results.filter((result) => result.status === 409)
  const other = results.filter((result) => ![201, 409].includes(result.status))

  console.log(`Fired ${PARALLEL} simultaneous enrollments:`)
  console.log(`  accepted (201): ${accepted.length}`)
  console.log(`  rejected (409): ${rejected.length}`)
  for (const result of rejected) console.log(`    · ${result.payload.message}`)
  for (const result of other) console.log(`  unexpected ${result.status}: ${JSON.stringify(result.payload)}`)

  const final = (await api(`/api/classes/${classId}`)).payload.data
  console.log(`Final size: ${final.studentCount} / ${final.capacity}`)

  if (accepted.length !== 1) fail(`expected exactly 1 acceptance, got ${accepted.length}`)
  if (rejected.length !== PARALLEL - 1) fail("some requests failed for the wrong reason")
  if (final.studentCount !== CAPACITY) fail(`expected ${CAPACITY} students, got ${final.studentCount}`)

  console.log(`PASS — capacity held at ${CAPACITY} under concurrent enrollment.`)
} finally {
  await api(`/api/classes/${classId}`, { method: "DELETE" })
  console.log("Scratch class removed.")
}
