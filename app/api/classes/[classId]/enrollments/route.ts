import { z } from "zod"
import { requireUser } from "@/lib/auth/session"
import { listClassMembers } from "@/lib/services/classes"
import { enrollStudent } from "@/lib/services/enrollments"
import { uuidSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

type Params = { params: Promise<{ classId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse((await params).classId)
    return ok(await listClassMembers(user.id, classId))
  } catch (error) {
    return fail(error)
  }
}

/** Capacity and duplicate rules live in the service, so the API cannot bypass them. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse((await params).classId)
    const { studentId } = z.object({ studentId: uuidSchema }).parse(await readJson(request))
    return ok(await enrollStudent(user.id, classId, studentId), 201)
  } catch (error) {
    return fail(error)
  }
}
