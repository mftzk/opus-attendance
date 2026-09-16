import { requireUser } from "@/lib/auth/session"
import { deleteClass, getOwnedClass, listClassMembers, updateClass } from "@/lib/services/classes"
import { classSchema, uuidSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

type Params = { params: Promise<{ classId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse((await params).classId)
    const [summary, members] = await Promise.all([
      getOwnedClass(user.id, classId),
      listClassMembers(user.id, classId),
    ])
    return ok({ ...summary, members })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse((await params).classId)
    await updateClass(user.id, classId, classSchema.parse(await readJson(request)))
    return ok(await getOwnedClass(user.id, classId))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser()
    await deleteClass(user.id, uuidSchema.parse((await params).classId))
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}
