import { requireUser } from "@/lib/auth/session"
import { getHistoryStats, listAttendanceHistory } from "@/lib/services/attendance"
import { attendanceFilterSchema } from "@/lib/validation/schemas"
import { fail, ok } from "@/lib/api/http"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const params = new URL(request.url).searchParams
    const filter = attendanceFilterSchema.parse(
      Object.fromEntries(
        [...params.entries()].filter(([, value]) => value !== ""),
      ),
    )
    const [history, stats] = await Promise.all([
      listAttendanceHistory(user.id, filter),
      getHistoryStats(user.id, filter),
    ])
    return ok({ ...history, stats })
  } catch (error) {
    return fail(error)
  }
}
