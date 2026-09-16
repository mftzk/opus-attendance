import { requireUser } from "@/lib/auth/session"
import {
  deleteStudent,
  getOwnedStudent,
  getStudentStats,
  listStudentClasses,
  updateStudent,
} from "@/lib/services/students"
import { studentSchema, uuidSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

type Params = { params: Promise<{ studentId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const studentId = uuidSchema.parse((await params).studentId)
    const [student, classes, stats] = await Promise.all([
      getOwnedStudent(user.id, studentId),
      listStudentClasses(user.id, studentId),
      getStudentStats(user.id, studentId),
    ])
    return ok({ ...student, classes, stats })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const studentId = uuidSchema.parse((await params).studentId)
    await updateStudent(user.id, studentId, studentSchema.parse(await readJson(request)))
    return ok(await getOwnedStudent(user.id, studentId))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    await deleteStudent(user.id, uuidSchema.parse((await params).studentId))
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}
