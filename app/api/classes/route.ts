import { requireUser } from "@/lib/auth/session"
import { createClass, listClasses } from "@/lib/services/classes"
import { classSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

export async function GET() {
  try {
    const user = await requireUser()
    return ok(await listClasses(user.id))
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const input = classSchema.parse(await readJson(request))
    return ok(await createClass(user.id, input), 201)
  } catch (error) {
    return fail(error)
  }
}
