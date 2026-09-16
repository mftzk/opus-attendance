/**
 * Seeds the shared demo account with realistic sample data.
 *
 * Re-running replaces the demo account's data and leaves every other account
 * untouched, so it is safe to run on each deployment.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"
import { connect } from "./db.mjs"

const scrypt = promisify(scryptCallback)

const DEMO_EMAIL = (process.env.DEMO_EMAIL || "demo@attendance.app").toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo12345"
const DEMO_NAME = process.env.DEMO_NAME || "Demo Teacher"

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`
}

const FIRST_NAMES = [
  "Anita", "Budi", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hendra", "Intan", "Joko",
  "Kirana", "Lukman", "Maya", "Nanda", "Oktavia", "Putra", "Qori", "Rizky", "Sinta", "Tono",
  "Utami", "Vino", "Wulan", "Yusuf", "Zahra", "Aldi", "Bella", "Cahya", "Dewi", "Erik",
  "Farah", "Galih", "Hana", "Irfan", "Jihan", "Kevin", "Lia", "Miko", "Nadia", "Omar",
  "Prita", "Rangga", "Sari", "Tirta", "Vera", "Wahyu", "Yoga", "Zaki", "Adit", "Bunga",
  "Candra", "Dian", "Elang", "Fitri",
]
const LAST_NAMES = [
  "Wijaya", "Santoso", "Pratama", "Lestari", "Nugroho", "Hakim", "Maulana", "Kusuma",
  "Rahmawati", "Siregar", "Halim", "Permata", "Saputra", "Anggraini", "Hidayat", "Puspita",
]

const CLASSES = [
  { name: "Computer Science A", description: "Semester 1 — Lab B2, Mon/Wed 08:00", size: 24 },
  { name: "Mathematics B", description: "Semester 1 — Room 204, Tue/Thu 10:00", size: 30 },
  { name: "Physics C", description: "Semester 2 — Lab A1, Fri 13:00", size: 14 },
]

const TOTAL_STUDENTS = 52
const ATTENDANCE_DAYS = 12

const pick = (list, index) => list[index % list.length]

/** The last `count` weekdays, oldest first. */
function recentWeekdays(count) {
  const dates = []
  const cursor = new Date()
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return dates.reverse()
}

// Deterministic mix: mostly present, with a believable share of the rest.
function statusFor(seed) {
  const bucket = seed % 20
  if (bucket < 15) return "present"
  if (bucket < 17) return "absent"
  if (bucket < 19) return "late"
  return "excused"
}

export async function seed(sql) {
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const [user] = await sql`
    INSERT INTO users (name, email, password_hash, is_demo)
    VALUES (${DEMO_NAME}, ${DEMO_EMAIL}, ${passwordHash}, true)
    ON CONFLICT (lower(email)) DO UPDATE
      SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, is_demo = true
    RETURNING id
  `
  const ownerId = user.id

  // Only the demo account's data is reset; the cascades clear enrollments and
  // attendance along with it.
  await sql`DELETE FROM classes WHERE owner_id = ${ownerId}`
  await sql`DELETE FROM students WHERE owner_id = ${ownerId}`

  const studentIds = []
  for (let index = 0; index < TOTAL_STUDENTS; index += 1) {
    const firstName = pick(FIRST_NAMES, index)
    const fullName = `${firstName} ${pick(LAST_NAMES, index * 3 + 1)}`
    const identifier = `S-${1001 + index}`
    const email = index % 4 === 0 ? null : `${firstName.toLowerCase()}.${1001 + index}@example.edu`
    const phone = index % 3 === 0 ? null : `+62 812 ${String(1000 + index).padStart(4, "0")} ${String(2000 + index * 7).slice(0, 4)}`

    const [row] = await sql`
      INSERT INTO students (owner_id, identifier, full_name, email, phone)
      VALUES (${ownerId}, ${identifier}, ${fullName}, ${email}, ${phone})
      RETURNING id
    `
    studentIds.push(row.id)
  }

  const dates = recentWeekdays(ATTENDANCE_DAYS)
  let offset = 0

  for (const definition of CLASSES) {
    const [klass] = await sql`
      INSERT INTO classes (owner_id, name, description)
      VALUES (${ownerId}, ${definition.name}, ${definition.description})
      RETURNING id
    `

    // Overlapping slices, so several students belong to more than one class.
    const members = []
    for (let seat = 1; seat <= definition.size; seat += 1) {
      const studentId = studentIds[(offset + seat - 1) % studentIds.length]
      members.push({ studentId, seat })
      await sql`
        INSERT INTO enrollments (class_id, student_id, seat_no)
        VALUES (${klass.id}, ${studentId}, ${seat})
      `
    }
    offset += Math.max(1, definition.size - 8)

    for (const [dayIndex, date] of dates.entries()) {
      // Leave the most recent day open for two classes so a visitor has
      // something to record.
      if (dayIndex === dates.length - 1 && definition.name !== "Computer Science A") continue
      for (const member of members) {
        const status = statusFor(member.seat * 7 + dayIndex * 3)
        await sql`
          INSERT INTO attendance_records (class_id, student_id, date, status, note)
          VALUES (
            ${klass.id}, ${member.studentId}, ${date}, ${status},
            ${status === "excused" ? "Family permission letter" : null}
          )
          ON CONFLICT (class_id, student_id, date)
          DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()
        `
      }
    }

    console.log(`✓ ${definition.name}: ${definition.size}/30 students, ${dates.length} days`)
  }

  console.log(`Demo account ready — ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = connect()
  try {
    await seed(sql)
  } finally {
    await sql.end()
  }
}
