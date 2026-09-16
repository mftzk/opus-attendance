import { requireUser } from "@/lib/auth/session"
import { createStudent, listStudents } from "@/lib/services/students"
import { studentSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const search = new URL(request.url).searchParams.get("search") ?? undefined
    return ok(await listStudents(user.id, search))
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    return ok(await createStudent(user.id, studentSchema.parse(await readJson(request))), 201)
  } catch (error) {
    return fail(error)
  }
}
