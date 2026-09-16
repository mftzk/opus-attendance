import { requireUser } from "@/lib/auth/session"
import { getAttendanceSheet, saveAttendance } from "@/lib/services/attendance"
import { isoDateSchema, saveAttendanceSchema, uuidSchema } from "@/lib/validation/schemas"
import { today } from "@/lib/date"
import { fail, ok, readJson } from "@/lib/api/http"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const params = new URL(request.url).searchParams
    const classId = uuidSchema.parse(params.get("classId"))
    const date = isoDateSchema.parse(params.get("date") ?? today())
    return ok(await getAttendanceSheet(user.id, classId, date))
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = saveAttendanceSchema.parse(await readJson(request))
    return ok(await saveAttendance(user.id, input))
  } catch (error) {
    return fail(error)
  }
}
