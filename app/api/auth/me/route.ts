import { requireUser } from "@/lib/auth/session"
import { fail, ok } from "@/lib/api/http"

export async function GET() {
  try {
    return ok(await requireUser())
  } catch (error) {
    return fail(error)
  }
}
