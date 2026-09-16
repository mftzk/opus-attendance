import { requireUser } from "@/lib/auth/session"
import { removeEnrollment } from "@/lib/services/enrollments"
import { uuidSchema } from "@/lib/validation/schemas"
import { fail, ok } from "@/lib/api/http"

type Params = { params: Promise<{ classId: string; studentId: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const { classId, studentId } = await params
    await removeEnrollment(user.id, uuidSchema.parse(classId), uuidSchema.parse(studentId))
    return ok({ removed: true })
  } catch (error) {
    return fail(error)
  }
}
