"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import { saveAttendanceSchema } from "@/lib/validation/schemas"
import { saveAttendance } from "@/lib/services/attendance"
import { toActionResult, validation, type ActionResult } from "@/lib/errors"
import { fieldErrors } from "./auth"

/**
 * The sheet posts `status-<studentId>` / `note-<studentId>` pairs; this
 * reshapes them into the validated service input.
 */
export async function saveAttendanceAction(
  _prev: ActionResult<{ saved: number }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ saved: number }>> {
  try {
    const user = await requireUser()

    const entries: { studentId: string; status: unknown; note: unknown }[] = []
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("status-")) continue
      const studentId = key.slice("status-".length)
      entries.push({
        studentId,
        status: value,
        note: formData.get(`note-${studentId}`) ?? "",
      })
    }

    const parsed = saveAttendanceSchema.safeParse({
      classId: formData.get("classId"),
      date: formData.get("date"),
      entries,
    })
    if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))

    const result = await saveAttendance(user.id, parsed.data)
    revalidatePath(`/attendance/${parsed.data.classId}`)
    revalidatePath("/attendance")
    revalidatePath("/")
    return {
      ok: true,
      message: `Attendance saved for ${result.saved} student${result.saved === 1 ? "" : "s"}.`,
      data: result,
    }
  } catch (error) {
    return toActionResult(error)
  }
}
